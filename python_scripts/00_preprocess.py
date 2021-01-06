import sys
import getopt
import json


def get_args(argv):
    # GET ARGS - data window and stride
    sensor_type = ''
    window = 200  # default values
    stride = 200
    buffer_size = 0

    # Help message
    help_mess = '''
        00_preprocess.py -t <sensor_type> -w <time_window> -s <stride> -b <buffer_size>
        sensor_type: "emg" / "mmg"
        time_window: time window width (in microseconds)
        stride: step distance that the window moves to get another time window (in microseconds)
        buffer_size: size of the circular buffer
        '''

    try:
        opts, args = getopt.getopt(argv, "ht:w:s:b:", ["sensor_type=", "time_window=", "stride=", "buffer_size="])
    except getopt.GetoptError:
        print(help_mess)
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print(help_mess)
            sys.exit()
        elif opt in ("-t", "--sensor_type"):
            sensor = arg
        elif opt in ("-w", "--window"):
            window = arg
        elif opt in ("-s", "--stride"):
            stride = arg
        elif opt in ("-b", "--buffer_size"):
            buffer_size = arg

    return sensor_type, window, stride, buffer_size


def create_preprocessor(sensor_type, window, stride, buffer_size):
    if sensor_type == 'emg':
        import emglimbo
        preprocessor = emglimbo.EMG_Preprocessor(window, stride, buffer_size)
    elif sensor_type == 'mmg':
        import mmglimbo
        preprocessor = mmglimbo.MMG_Preprocessor(window, stride, buffer_size)
    else:
        raise Exception('Required argument sensor_type must be "emg" or "mmg"! Use -h option to print help.')
    return preprocessor

'''
    def on_message(client, userdata, msg):
        try:
            prepared_samples = process_message(str(msg.payload.decode('utf-8')))
            for sample in prepared_samples:
                circular_buffer.append(sample)
                if circular_buffer.get_portion_size(time_window=2000000) >= 100:
                    print(json.dumps(
                        get_accelerometer_features(circular_buffer.get_portion(time_window=2000000, stride=100))))
        except JSONDecodeError:
            print('Json decode error.')
            '''


def preprocess(preprocessor):

    try:
        for line in sys.stdin:
            # If user type 'exit', terminate script
            if line == 'exit':
                sys.exit()

            preprocessor.preprocess(line)

            if preprocessor.check_buffered_data_size():
                features = preprocessor.get_features()  # returns 1D vector with features
                features_dict = {"features": features}
                features_json = json.dumps(features_dict)
                print(features_json)

    except KeyboardInterrupt:
        sys.exit()


if __name__ == "__main__":
    sensor_type, window, stride, buffer_size = get_args(sys.argv[1:])
    preprocessor = create_preprocessor(sensor_type, window, stride, buffer_size)
    preprocess(preprocessor)
