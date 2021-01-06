import sys
import json
import getopt
import numpy as np


def get_args(argv):
    # Sensor type
    sensor = ''
    model_path = 'model.tar'

    # Help message
    help_mess = '''
    02_classify.py -t <sensor_type> -m <model_path>
    sensor_type: "emg" / "mmg"
    model_path: path to the model
    '''

    try:
        opts, args = getopt.getopt(argv, "ht:m:", ["sensor_type=", "model_path="])
    except getopt.GetoptError:
        print(help_mess)
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print(help_mess)
            sys.exit()
        elif opt in ("-t", "--sensor_type"):
            sensor = arg
        elif opt in ("-m", "--model_path"):
            model_path = arg

    return sensor, model_path


def create_classifier(sensor_type, model_path):
    if sensor_type == 'emg':
        import emglimbo
        classifier = emglimbo.EMGClassifier(model_path)
    elif sensor_type == 'mmg':
        import emglimbo
        classifier = emglimbo.EMGClassifier(model_path)
    else:
        raise Exception('Required argument sensor_type must be "emg" or "mmg"! Use -h option to print help.')
    return classifier


def classify(classfier):
    try:
        for line in sys.stdin:
            # If user type 'exit', terminate script
            if line == 'exit':
                sys.exit()

            # Get features from json
            clean_line = ''.join(line.split())
            input_json = json.loads(clean_line)
            features = np.array(input_json['features'])

            prob_dist = classifier.classify(features, fake=True)
            pd_json = json.dumps(prob_dist)
            print(pd_json)

    except KeyboardInterrupt:
        sys.exit()


if __name__ == "__main__":
    sensor_type, model_path = get_args(sys.argv[1:])
    classifier = create_classifier(sensor_type, model_path)
    classify(classifier)

# Input
'''{"features":[2, 1, 2, 3]}'''
