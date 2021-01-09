# Sensors Server Scripts #

## Purpose ##

Enable server backend to use sensors' classifiers by exchanging data via stdin and stdout.

## Functional requirements ##

There are three scripts that server can use:

* Preprocessing script (data buffering and filtering) - input: a JSON with EMG data received via MQTT from EMG sensor; output: a JSON with calculated features for a classifier.
* Fine tuning script - input: a JSON created by Preprocessing script (+ label added by server); output: info about successed/failed fine tuning (eventually JSON with loss).
* Classifying script - input: a JSON created by Preprocessing script; output: probability distribution of performed gesture (JSON).


## Deps ##

* [NumPy](https://numpy.org/)
* [SciPy](https://www.scipy.org/)
* [PyTorch](https://pytorch.org/)

## Usage ##

* Preprocessing script
~~~~
	00_preprocess.py -t emg -w 200 -s 200 -b 300
~~~~

* Fine tuning script
~~~~
	01_fine_tune.py -s emg -m emg_model.tar
~~~~

* Classifying script
~~~~
	02_classify.py -s emg -m emg_model.tar
~~~~

where sensor_type is "emg" or "mmg". Any other will raise an exception. Parameter model_path is not required.
