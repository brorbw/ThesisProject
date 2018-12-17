#!/bin/bash 
for i in {1..18}
do
node ./app.js $(($2+$i)) ../AES-128 &
sleep 0.5;curl "http://$3:$(($2+$i))/sensors/connect?port=3000&ip=$4"&>/dev/null
sleep 0.5
done
