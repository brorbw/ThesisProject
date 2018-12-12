#!/bin/bash
ip=$(ifconfig | grep "inet " | grep -Fv 127.0.0.1 | awk '{print $2}' | tail -n 1);
echo $ip;
for i in {1..10}; 
do 
	node ./app.js $((3000+$i)) "../keys/AES-128" & 
	sleep 1;
	curl "http://$ip:$((3000+$i))/sensors/connect?port=$((3000))&ip=192.168.87.101"; 
done
