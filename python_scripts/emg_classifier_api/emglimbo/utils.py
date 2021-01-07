import numpy as np
import base64
import struct
import json
from scipy import signal

from . import constants


def filter_signals(s: np.ndarray, fs: int) -> np.ndarray:
    # Highpass filter
    fd = 10  # Hz
    n_fd = fd / (fs / 2)  # normalized frequency
    b, a = signal.butter(1, n_fd, 'highpass')
    hp_filtered_signal = signal.lfilter(b, a, s.T)

    # Notch filter
    notch_filtered_signal = hp_filtered_signal  # cut off the beginning and transpose
    for f0 in [50, 100, 200]:  # 50Hz and 100Hz notch filter
        Q = 5  # quality factor
        b, a = signal.iirnotch(f0, Q, fs)
        notch_filtered_signal = signal.lfilter(b, a, notch_filtered_signal)

    return notch_filtered_signal.T


def _base64_to_list_of_channels(encoded_data: str) -> list:
    """Converts a base64 string of samples (from each channel) to a list of integers.
    There is a conversion from 24-bit signed int to 32-bit signed int before unpacking from bytes.

    :param encoded_data: encoded data (in base64) from each channel joined into the one string
    :type encoded_data: string
    :return: decoded samples from each channel
    :rtype: list
    """
    output = list()
    for i in range(0, len(encoded_data), constants.BASE64_BYTES_PER_SAMPLE):
        # decode base64
        decoded_bytes = base64.b64decode(
            encoded_data[i:i + constants.BASE64_BYTES_PER_SAMPLE]
        )

        # convert 24-bit signed int to 32-bit signed int
        decoded = struct.unpack('>i', (b'\0' if decoded_bytes[0] < 128 else b'\xff') + decoded_bytes)
        output.append(decoded[0])
    return output


def json_2_array_of_data(input_json: str) -> np.ndarray:
    """
    Gets data from input JSON, converts it to float values in uV and arranges it in NumPy ndarray.

    :param input_json: JSON arrived from the OpenBCI WiFi Shield module
    :type input_json: str
    :return: data in uV. Each row of this 2d array contains samples from all OpenBCI Cyton's channels.
    :rtype: numpy.ndarray
    """

    rows = []
    # Decode another JSON
    packet = json.loads(input_json)

    # Read number of channels
    num_channels = packet["channels"]

    # Read frequency
    fs = packet["frequency"]

    # Iterate over data
    for encoded_channels in packet["data"]:
        # Check a length of the data
        if len(encoded_channels) == num_channels * constants.BASE64_BYTES_PER_SAMPLE:
            # Get a list of values on each channel
            channels_list = _base64_to_list_of_channels(encoded_channels)
            # Scale data to uV
            scaled_data = np.asarray(channels_list) * constants.SCALE_FACTOR_EMG
            rows.append(scaled_data)
        else:
            raise Exception("Wrong length of the data!")

    return np.asarray(rows), fs


# Press the green button in the gutter to run the script.
if __name__ == '__main__':

    # Test def _base64_to_list_of_channels(encoded_data: str) -> list
    with open('unittests_data/decoded_base64.json') as f:
        corr_y = json.load(f)
    with open('unittests_data/example_base64_value.txt') as f:
        x = f.readline()
    y = _base64_to_list_of_channels(x)
    assert y == corr_y

    # Test def json_2_array_of_data(input_json: str) -> np.ndarray
    corr_y = np.loadtxt('unittests_data/data_decoded_from_json.csv', delimiter=',', skiprows=1)
    with open('unittests_data/example_incoming_json.txt') as f:
        x = f.readline()
    y = json_2_array_of_data(x)
    np.testing.assert_array_almost_equal(y, corr_y, decimal=10)
