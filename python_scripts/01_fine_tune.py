import sys
import json
import numpy as np
import getopt


def get_args(argv):
    # Sensor type
    sensor = ''
    model_path = 'model.tar'

    # Help message
    help_mess = '''
    01_fine_tune.py -t <sensor_type> -m <model_path>
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


def fine_tune(classifier, model_path):

    try:
        for line in sys.stdin:
            # If user type 'exit', terminate script
            if line == 'exit':
                # Save model
                classifier.save_model(model_path)

                sys.exit()

            # Get features from json
            clean_line = ''.join(line.split())
            input_json = json.loads(clean_line)
            features = np.array(input_json['features'])
            label = input_json['label']

            # TODO check "command" in json: if "gather" collect features and labels, if "finish" fined tune the model

            # Fine tune
            success = classifier.train(features, label, fake=True)
            if success:
                print(f"Successful fine tuning.")

    except KeyboardInterrupt:
        # Save model
        classifier.save_model(model_path)

        sys.exit()


if __name__ == "__main__":
    sensor_type, model_path = get_args(sys.argv[1:])
    classifier = create_classifier(sensor_type, model_path)
    fine_tune(classifier, model_path)

# Input
'''{"features":[2, 1, 2, 3],"label":[1, 0, 0, 0]}'''