let client = null; // MQTT 클라이언트의 역할을 하는 Client 객체를 가리키는 전역변수
let connectionFlag = false; // 연결 상태이면 true
const CLIENT_ID = "client-"+Math.floor((1+Math.random())*0x10000000000).toString(16) // 사용자 ID 랜덤 생성


window.addEventListener("beforeunload", function () {
    sessionStorage.setItem("mqttConnected", connectionFlag ? "true" : "false");
});

window.addEventListener("load", function () {
    const connected = sessionStorage.getItem("mqttConnected") === "true";
    console.log(CLIENT_ID);
    if (connected) {
        console.log("이전 MQTT 연결 상태 유지.");
    } else {
        console.log("새로운 MQTT 연결 시작.");
        let url = new String(document.location);
        let ip = url.split("//")[1].split(":")[0];
        connect(ip);
    }
});

function connect(ip) { // 브로커에 접속하는 함수
	if(connectionFlag == true)
		return; // 현재 연결 상태이므로 다시 연결하지 않음

	// 사용자가 입력한 브로커의 IP 주소와 포트 번호 알아내기
	// let broker = document.getElementById("broker").value; // 브로커의 IP 주소
	let broker = ip
	let port = 9001 // mosquitto를 웹소켓으로 접속할 포트 번호

	// MQTT 메시지 전송 기능을 모두 가징 Paho client 객체 생성
	client = new Paho.MQTT.Client(broker, Number(port), CLIENT_ID);

	// client 객체에 콜백 함수 등록 및 연결
	client.onConnectionLost = onConnectionLost; // 접속 끊김 시 onConnectLost() 실행 
	client.onMessageArrived = onMessageArrived; // 메시지 도착 시 onMessageArrived() 실행

	// client 객체에게 브로커에 접속 지시
	client.connect({
		onSuccess:onConnect, // 브로커로부터 접속 응답 시 onConnect() 실행
	});
}

// 브로커로의 접속이 성공할 때 호출되는 함수
function onConnect() {
	connectionFlag = true; // 연결 상태로 설정
	subscribe("car");
	subscribe("charge");
    subscribe("place");
}

function subscribe(topic) {
	if(connectionFlag != true) { // 연결되지 않은 경우
		alert("연결되지 않았음");
		return false;
	}

	client.subscribe(topic); // 브로커에 구독 신청
	return true;
}

function publish(topic, msg) {
	if(connectionFlag != true) { // 연결되지 않은 경우
		alert("연결되지 않았음");
		return false;
	}
	client.send(topic, msg, 0, false);
	return true;
}

function unsubscribe(topic) {
	if(connectionFlag != true) return; // 연결되지 않은 경우
	
	client.unsubscribe(topic, null); // 브로커에 구독 신청 취소
}

// 접속이 끊어졌을 때 호출되는 함수
function onConnectionLost(responseObject) { // responseObject는 응답 패킷
	// document.getElementById("cars").innerHTML += '<span>오류 : 접속 끊어짐</span><br/>';
	if (responseObject.errorCode !== 0) {
		// document.getElementById("cars").innerHTML += '<span>오류 : ' + responseObject.errorMessage + '</span><br/>';
	}
	connectionFlag = false; // 연결 되지 않은 상태로 설정
}
let carCharge = {}; //차 - 요금 객체
// 메시지가 도착할 때 호출되는 함수
function onMessageArrived(msg) {
    console.log("onMessageArrived: " + msg.payloadString);

    if (msg.destinationName === "car") {
        const carsElement = document.getElementById("cars");
        carsElement.innerHTML = ""; // 기존 내용을 초기화

        try {
            // JSON 문자열을 배열로 변환
            const carData = JSON.parse(msg.payloadString);

            // 배열 데이터를 순회하며 각 요소를 화면에 출력
            carData.forEach((carName) => {
                const carEntry = document.createElement("div");

                // 차량 정보 텍스트
                const carInfo = document.createElement("span");
                carInfo.textContent = carName;

                // 버튼 생성
                const carButton = document.createElement("button");
                carButton.textContent = "차량 정보";
                carButton.onclick = function () {
                    handleCarInfo(carName); // 배열 요소(차량 번호)를 전달
                };

                // 텍스트와 버튼을 carEntry에 추가
                carEntry.appendChild(carInfo);
                carEntry.appendChild(carButton);
                carsElement.appendChild(carEntry);


                // 각 차량 이름을 carCharge에 추가
                if (!carCharge[carName]) {
                    carCharge[carName] = null; // 기본적으로 charge는 null로 설정
                }
            });
        
        } catch (error) {
            console.error("JSON 파싱 에러:", error);
            carsElement.innerHTML = '<span>Invalid JSON format</span><br/>';
        }
    } else if (msg.destinationName === "charge") {
        const chargeElement = document.getElementById("charge");
        chargeElement.innerHTML = "";

        try {
            // JSON 문자열을 객체로 변환
            const chargeData = JSON.parse(msg.payloadString);

            // 각 키와 값을 한 줄씩 출력
            for (const [carName, charge] of Object.entries(chargeData)) {
                const chargeEntry = document.createElement("div");
                chargeEntry.textContent = `${carName}: ${charge}`;
                chargeElement.appendChild(chargeEntry);

                if (carCharge[carName] !== undefined) {
                    carCharge[carName] = charge; // 해당 차량의 charge 업데이트
                }
            }
        } catch (error) {
            console.error("JSON 파싱 에러:", error);
            chargeElement.innerHTML = '<span>Invalid JSON format</span><br/>';
        }
    } else if(msg.destinationName === "place"){
        addChartData(parseInt(msg.payloadString));
    }
}

// 차량 정보를 처리하는 함수
function handleCarInfo(carInfo) {
    console.log("Handling car info:", carInfo);

    const baseUrl = `${window.location.protocol}//${window.location.host}/carInfo`;

    // POST 요청 전송
    fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            carName: carInfo,
            dataStore: carCharge
        }),
    })
    .then(response => response.text())
    .then(data => {
        // 서버 응답 처리
        document.body.innerHTML = data; // 서버에서 렌더링된 HTML을 화면에 표시
    })
    .catch(error => console.error('Error:', error));
}



// disconnection 버튼이 선택되었을 때 호출되는 함수
function disconnect() {
	if(connectionFlag == false) 
		return; // 연결 되지 않은 상태이면 그냥 리턴
	
	// 켜진 led 끄기
	if(document.getElementById("ledOn").checked == true) {
		client.send('led', "0", 0, false); // led를 끄도록 메시지 전송
		document.getElementById("ledOff").checked = true;
	}

	client.disconnect(); // 브로커와 접속 해제
	document.getElementById("cars").innerHTML += '<span>연결종료</span><br/>';
	connectionFlag = false; // 연결 되지 않은 상태로 설정
}

