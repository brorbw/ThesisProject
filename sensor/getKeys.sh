#!/bin/bash
for i in {1..10}
do
echo "$i,$(curl -s "http://$3:$(($2+$i))/keys/number")"
sleep 1
done
