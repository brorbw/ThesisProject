#!/bin/bash
ip=$(ifconfig | grep "inet " | grep -Fv 127.0.0.1 | awk '{print $2}' | tail -n 1);
echo $ip;
for i in {1..10}; 
do 
	node ./app.js $((4000+$i)) "../keys/AES-128" & 
	sleep 1;
	curl "http://$ip:$((4000+$i))/sensors/connect?port=$((3000+$i-1))&ip=192.168.87.108"; 
done
