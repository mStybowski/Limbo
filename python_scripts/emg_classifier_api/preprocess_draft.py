import sys
import getopt
import numpy as np

from emglimbo.utils import json_2_array_of_data
from emglimbo.utils import filter_signals
from emglimbo import CircularQueue


def preprocess(argv):
    # GET ARGS - data window and stride
    window = 200  # default values
    stride = 200
    try:
        opts, args = getopt.getopt(argv, "hw:s:", ["window=", "stride="])
    except getopt.GetoptError:
        print('preprocess_draft.py -w <window> -s <stride>')
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print('preprocess_draft.py -w <window> -s <stride>')
            sys.exit()
        elif opt in ("-st", "--sensor_type"):
            sensor = arg
        elif opt in ("-w", "--window"):
            window = arg
        elif opt in ("-s", "--stride"):
            stride = arg


    # Create buffer
    buffer_cap = int(1.5 * window)
    buffer = CircularQueue(buffer_cap)

    data_to_send = np.array([])

    try:
        for line in sys.stdin:
            # If user type 'exit', terminate script
            if line == 'exit':
                sys.exit()

            # Decode a message
            clean_line = ''.join(line.split())
            data_array, fs = json_2_array_of_data(clean_line)

            # Push data to the buffer
            for i in data_array.shape[0]:
                buffer.push(data_array[i])

            # Check if buffer collected required data window
            if buffer.get_size() >= window:
                # get data from the buffer
                data_from_buffer = buffer.get_window_of_data(window)
                # filtering
                expanded_data = np.concatenate((data_from_buffer,) * 3)  # triple data length for filtering
                filtered_exp_data = filter_signals(np.concatenate(expanded_data), fs)
                filtered_data = filtered_exp_data[-window:]

                # TODO add data to data_to_send including window and stride

                '''
                features_dict = {'features': data_array}
                features_json = json.dumps(features_dict)
                print(features_json)
                '''
    except KeyboardInterrupt:
        sys.exit()


if __name__ == "__main__":
    preprocess(sys.argv[1:])
