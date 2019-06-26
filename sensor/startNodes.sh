#!/bin/bash 
for i in {1..10}
do
node ./app.js $(($1+$i)) ../AES-128 &
sleep 1;curl "http://127.0.0.1:$(($1+$i))/sensors/connect?port=$((3000+$i-1))&ip=127.0.0.1"
sleep 1
done
