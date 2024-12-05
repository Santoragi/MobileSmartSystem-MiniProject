let ctx = null;
let chart = null;
let config = {
	// type은 차트 종류 지정
	type: 'line', // 라인그래프
	// data는 차트에 출력될 전체 데이터 표현
	data: {
		// labels는 배열로 데이터의 레이블들
		labels: [],
		// datasets 배열로 이 차트에 그려질 모든 데이터 셋 표현. 그래프 1개만 있음
		datasets: [{
			label: '주차장 남은 자리 현황',
			backgroundColor: 'blue',
			borderColor: 'rgb(255, 99, 132)',
			borderWidth: 2,
			data: [], // 각 레이블에 해당하는 데이터
			fill : false, // 채우지 않고 그리기
		}]
	},
	// 차트의 속성 지정
	options: {
		responsive : false, // 크기 조절 금지
		scales: { // x축과 y축 정보
			xAxes: [{
				display: true,
				scaleLabel: { display: true, labelString: '시간(초)' },
			}],
			yAxes: [{
				display: true,
				scaleLabel: { display: true, labelString: '남은 자리' },
				// 거리 값의 편차가 너무 커서 y축 눈금의 최대 최소를 지정하지 않았음
				ticks: {
					min: 0,
					max: 2,
					stepSize: 1
				}
			}]
		}
	}
};

let LABEL_SIZE = 20; // 차트에 그려지는 데이터의 개수 
let tick = 0; // 도착한 데이터의 개수임, tick의 범위는 0에서 99까지만 

function drawChart() {
	ctx = document.getElementById('canvas').getContext('2d');
	chart = new Chart(ctx, config);
	init();
} 

function init() { // chart.data.labels의 크기를 LABEL_SIZE로 만들고 0~19까지 레이블 붙이기
	for(let i=0; i<LABEL_SIZE; i++) {
		chart.data.labels[i] = i;
	}
	chart.update();
}

function addChartData(value) {
	let n = chart.data.datasets[0].data.length; // 현재 데이터의 개수 
	if(n < LABEL_SIZE) // 현재 데이터 개수가 LABEL_SIZE보다 작은 경우
		chart.data.datasets[0].data.push(value);
	else { // 현재 데이터 개수가 LABEL_SIZE를 넘어서는 경우
		// 새 데이터 value 삽입
		chart.data.datasets[0].data.push(value); // value를 data[]의 맨 끝에 추가
		chart.data.datasets[0].data.shift(); // data[]의 맨 앞에 있는 데이터 제거
		// 레이블 삽입
		chart.data.labels.push(tick); // tick(인덱스)을 labels[]의 맨 끝에 추가
		chart.data.labels.shift(); // labels[]의 맨 앞에 있는 값 제거
	}
	tick++; // 도착한 데이터의 개수 증가
	tick %= 100; // tick의 범위는 0에서 99까지만. 100보다 크면 다시 0부터 시작
	chart.update();
}

function hideshow() { // 캔버스 보이기 숨기기 
	let canvas =  document.getElementById('canvas'); // canvas DOM 객체 알아내기
	if(canvas.style.display == "none") // canvas 객체가 보이지 않는다면
		canvas.style.display = "inline-block"; // canvas 객체를 보이게 배치
	else 
		canvas.style.display = "none" ;  // canvas 객체를 보이지 않게 배치
}
