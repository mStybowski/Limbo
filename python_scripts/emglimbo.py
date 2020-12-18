# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.

import base64
import struct
import numpy as np
import json
import math

class EMGClassifier:
    """
    Server API for EMG classifier.
    """

    # All possible gestures
    GESTURES = ['idle', 'wrist flexion', 'wrist extension', 'ulnar deviation', 'radial deviation',
                'pronation', 'supination', 'clenched fist', 'thumb extension', 'pinch 1-2',
                'pinch 1-3', 'pinch 1-4', 'pinch 1-5']

    BASE64_BYTES_PER_SAMPLE = 4
    SCALE_FACTOR_EMG = 4500000 / 24 / (2 ** 23 - 1)  # uV/count
    EMG_FREQUENCY = 1000  # Hz

    def __init__(self):
        pass

    def classify(self, input_data):
        """
        Make a prediction based on input data.

        :param input_data: a list of JSONs (strings), in each of them there's a bunch of packets
        :type input_data: list
        :return: classified gesture as a string
        :rtype: string
        """

        # Get data from JSONs
        data = EMGClassifier.list_of_jsons_2_array_of_data(input_data)

        if data.size == 0:
            print("Input list is empty, cannot make a prediction!")
            return ""
        else:
            # Make a fake prediction
            idx = math.floor(data[0][0] % len(EMGClassifier.GESTURES))
            return EMGClassifier.GESTURES[idx]

    def fine_tune(self, input_data, gesture):
        """
        Fine tune based on labeled input data.

        :param input_data: a list of JSONs (strings), in each of them there's a bunch of packets
        :type input_data: list
        :param gesture: a label for input data
        :type gesture: string
        :return: success
        :rtype: bool
        """

        # Get data from JSONs
        data = EMGClassifier.list_of_jsons_2_array_of_data(input_data)

        if data.size == 0:
            print("Input list is empty, cannot make a prediction!")
            return False
        else:
            # Here will be fine tuning
            print("Model fine tuned!")
            return True

    @staticmethod
    def base64_to_list_of_channels(encoded_data):
        """Converts a base64 string of samples (from each channel) to a list of integers.
        There is a conversion from 24-bit signed int to 32-bit signed int before unpacking from bytes.

        :param encoded_data: encoded data (in base64) from each channel joined into the one string
        :type encoded_data: string
        :return: decoded samples from each channel
        :rtype: list
        """
        output = list()
        for i in range(0, len(encoded_data), EMGClassifier.BASE64_BYTES_PER_SAMPLE):
            # decode base64
            decoded_bytes = base64.b64decode(
                encoded_data[i:i+EMGClassifier.BASE64_BYTES_PER_SAMPLE]
            )

            # convert 24-bit signed int to 32-bit signed int
            decoded = struct.unpack('>i', (b'\0' if decoded_bytes[0] < 128 else b'\xff') + decoded_bytes)
            output.append(decoded[0])
        return output

    @staticmethod
    def list_of_jsons_2_array_of_data(list_of_jsons):
        """
        Gets data from input JSONs, converts them to float values in uV and arranges them in NumPy ndarray.

        :param list_of_jsons: JSONs arrived from the OpenBCI WiFi Shield module
        :type list_of_jsons: list
        :return: data in uV. Each row of this 2d array contains samples from all OpenBCI Cyton's channels.
        :rtype: numpy.ndarray
        """

        rows = []
        for json_str in list_of_jsons:
            # Decode another JSON
            packet = json.loads(json_str)

            # Read number of channels
            num_channels = packet["channels"]

            # Iterate over data
            for encoded_channels in packet["data"]:
                # Check a length of the data
                if len(encoded_channels) == num_channels * EMGClassifier.BASE64_BYTES_PER_SAMPLE:
                    # Get a list of values on each channel
                    channels_list = EMGClassifier.base64_to_list_of_channels(encoded_channels)
                    # Scale data to uV
                    scaled_data = np.asarray(channels_list) * EMGClassifier.SCALE_FACTOR_EMG
                    rows.append(scaled_data)
                else:
                    raise Exception("Wrong length of the data!")

        return np.asarray(rows)


