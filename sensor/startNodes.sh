#!/bin/bash 
for i in {1..10}
do
node ./app.js $(($2+$i)) ../AES-128 &
sleep 0.5;curl "http://$3:$(($2+$i))/sensors/connect?port=$((3000+$i-1))&ip=$4"
sleep 1
done
