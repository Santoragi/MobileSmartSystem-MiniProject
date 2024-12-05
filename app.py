from flask import Flask, render_template, request
app = Flask(__name__)

# 자바스크립트 코드나 이미지 파일 등에 대해
# 브라우저에게 캐시에 저장한 파일을 사용하지 않도록 지시
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/carInfo', methods=['POST'])
def car_info():
    data = request.get_json()
    car_name = data.get('carName')
    data_store = data.get('dataStore')  # Python dict 형태로 전달
    charge = data_store.get(car_name)

    if not car_name:
        return "Car name is missing", 400
    

    # data_store와 car_name을 사용하여 처리
    return render_template('car_info.html', car_name=car_name, charge=charge)




if __name__ == "__main__":
	app.run(host='0.0.0.0', port=8080, debug=True)

