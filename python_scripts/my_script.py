import sys, json

# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.


class EMGClassifier:

    def __init__(self):
        pass

    def fine_tune(self, num):

        a = EMGClassifier.addtwo(num)
        b = EMGClassifier.multiplybytwo(a)
        return(b)

    @staticmethod
    def addtwo(num):
        return num+2

    @staticmethod
    def multiplybytwo(num):
        return num*2


p1 = EMGClassifier()

print("-----------FROM PYTHON-----")
print(sys.argv)
# simple JSON echo script
for line in sys.stdin:
  print(p1.fine_tune(int(line)))

print("-----------FROM PYTHON-----")