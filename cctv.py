import time
import RPi.GPIO as GPIO
import cv2
import sys, os, platform
from ctypes import *
import numpy as np
from PIL import Image
from datetime import datetime
import threading


IMG_PATH = './static/images/' #이미지 저장 경로
LIB_PATH = './library/tsanpr-KR-v2.4.2L/linux-aarch64/libtsanpr.so' #라이브러리 경로

# 라이브러리 초기화
lib = cdll.LoadLibrary(LIB_PATH)
lib.anpr_initialize.argtype = c_char_p
lib.anpr_initialize.restype = c_char_p
lib.anpr_read_file.argtypes = (c_char_p, c_char_p, c_char_p)
lib.anpr_read_file.restype = c_char_p

# GPIO 핀 설정
trig = 20  # GPIO20
echo = 16  # GPIO16
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(trig, GPIO.OUT)
GPIO.setup(echo, GPIO.IN)
red_led = 6 #GPIO6
green_led = 5 #GPIO5
GPIO.setup(red_led,GPIO.OUT)
GPIO.setup(green_led,GPIO.OUT)

# 카메라 초기화
camera = cv2.VideoCapture(0, cv2.CAP_V4L)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
buffer_size = 1
camera.set(cv2.CAP_PROP_BUFFERSIZE, buffer_size)


pre = 0  # 이전 상태를 저장하는 변수
near_threshold = 20 # 10cm 이내
carDict = {} #차의 번호와 입장한 시간 딕셔너리
carList = [] #현재 주차장 안의 차 리스트
full = 2 # 주차 자리 개수

# 라이브러리 초기화
def initialize():
    # 'text'를 c_char_p 타입으로 변환
    error = lib.anpr_initialize(c_char_p(b'text'))
    print("init")
    return error.decode('utf8') if error else error


def readFile(imgFile, outputFormat, options):
  print('{0} (outputFormat=\"{1}\", options=\"{2}\") => '.format(imgFile, outputFormat, options), end='')
  
  # 이미지 파일명 입력으로 차번 인식
  result = lib.anpr_read_file(imgFile.encode('utf-8'), outputFormat.encode('utf-8'), options.encode('utf-8'))
  print(result.decode('utf8'))
  return result.decode('utf8')

def anprDemo1(carName, outputFormat):
  # anpr
  return readFile(os.path.join(IMG_PATH, carName), outputFormat, '')

# 초음파 센서로 거리 측정
def measureDistance(trig, echo):
    time.sleep(0.2)  # 준비 시간
    GPIO.output(trig, 1)  # 초음파 발사
    time.sleep(0.00001)  # 10µs 대기
    GPIO.output(trig, 0)

    while GPIO.input(echo) == 0:  # echo 핀 Low->High 대기
        pulse_start = time.time()

    while GPIO.input(echo) == 1:  # echo 핀 High->Low 대기
        pulse_end = time.time()

    pulse_duration = pulse_end - pulse_start
    return pulse_duration * 340 * 100 / 2  # 거리 계산 (cm)

# 거리 판단
def judgeDistance(distance, near_threshold):
    return 1 if distance <= near_threshold else 0 

# 남은 공간 판단
def judgeSpace(cnt_car, full):
    if cnt_car < full:   # 자리가 있으면 초록불 켜기
        led_on_off(green_led, 1, duration=3)
        led_on_off(red_led, 0)  # 빨간불은 꺼짐 유지
        return 1
    else:               # 자리가 없으면 빨간불 켜기
        led_on_off(green_led, 0)  # 초록불은 꺼짐 유지
        led_on_off(red_led, 1, duration=3)
        return 0


def led_on_off(pin, value, duration=None):
    GPIO.output(pin, value)
    if duration and value == 1:  # LED를 켜는 경우에만 동작
        # LED 끄기를 별도의 스레드에서 실행
        threading.Timer(duration, lambda: GPIO.output(pin, 0)).start()

    
def cal_charge(now, old): #요금 계산

    # 문자열을 datetime 객체로 변환
    format = "%Y-%m-%d %H:%M:%S"
    datetime1 = datetime.strptime(old, format)
    datetime2 = datetime.strptime(now, format)
    
    # 시간 차이 계산 (초 단위로 계산한 뒤 분 단위로 변환)
    time_difference = abs((datetime2 - datetime1).total_seconds())

    # minutes = int(time_difference // 60)

    #시연을 위해 초당 요금 적용
    return time_difference*5

    


def access_car():
    global pre
    global carDict
    filename = None
    carName = "none"
    distance = measureDistance(trig, echo)
    current = judgeDistance(distance, near_threshold)
    
    if current == 1 and pre == 0:  # 물체가 10cm 이내로 처음 접근했을 때
        #자리 검사
        space = judgeSpace(len(carDict),full)
        if space == 1:
            print("주차장 자리가 있습니다. 현재: ", len(carDict))
        else:
            print("주차장 자리가 없습니다. 현재: ", len(carDict))
                    
        for i in range(buffer_size+1):
            ret, frame = camera.read()

        if ret:
            # 이미지 저장
            time_in = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # filename = time.strftime("%Y%m%d_%H%M%S.jpg")
            filename = time_in + ".jpg"
            file_path = os.path.join(IMG_PATH, filename)
            cv2.imwrite(file_path, frame)  # 사진 저장
        
            # 번호판 인식
            carName = anprDemo1(filename, 'text')

            if not carName:  # 인식 실패 처리
                print("번호판 인식 실패")
                os.remove(file_path)
                carName = "none"
            else:
                # 이름 변경             
                new_path = os.path.join(IMG_PATH, carName)
                # 이미 같은 번호의 차가 있다면 나가는 것으로 간주
                old = carDict.get(carName)
                if old: 
                    os.rename(file_path, new_path)
                    os.remove(new_path)
                    carDict.pop(carName)
                    carList.remove(carName)
                    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    charge = cal_charge(now, old)
                    print(f"{carName} 주차장 나감")
                    print("요금", charge)
                    print("남은 자리: ", full - len(carDict))
                else:
                    try:
                        os.rename(file_path, new_path)
                        print(f"{carName} 주차장 입장")                 
                        carDict[carName] = time_in #차 번호 : 입장 시간
                        carList.append(carName)
                        print("남은 자리: ", full - len(carDict))
                    except FileNotFoundError:
                        print(f"Error: {file_path} 또는 {new_path}가 존재하지 않습니다.")
                    except Exception as e:
                        print(f"Unexpected error during rename: {e}")

        else:
            print("사진 촬영 실패")
            

    pre = current  # 상태 업데이트
    return carList,carDict

    




