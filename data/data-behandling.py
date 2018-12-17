import sys
import math

def fileOpener(filepath):
    fp = open(filepath,'r')
    line = fp.readline()
    line = fp.readline()
    array = []
    count = 0
    while line:
        tmpline = line.split(',')
        array.append(int(tmpline[2]))
        line = fp.readline()
        count += 1
        #print(int(tmpline[2]))
    return array

def mean(numList):
    return sum(numList)/len(numList)

def sddv(numList,theMean):
    varianceSum = 0
    for number in numList:
        variance = pow(number-theMean,2)
        varianceSum += variance
    fraction = varianceSum/(len(numList)-1)
    return math.sqrt(fraction)

def trafficCount(file):
    fp = open(file,'r')
    line = fp.readline()
    array = [0 for x in range(10)]
    while line:
        tmpline = line.split(',')
        array[int(tmpline[0])-3001] += 1
        line = fp.readline()
    return array

def main():
    #fileAsArray = fileOpener(sys.argv[1])
    #filemean = mean(fileAsArray)
    #stddv = sddv(fileAsArray,filemean)
    #print("%f,%f"%(filemean,stddv))
    totaltraffic = trafficCount(sys.argv[1])
    for i in range(0,10):
        print(("%i,%i")%(i+1,totaltraffic[i]));

if __name__ == "__main__":
    main()
