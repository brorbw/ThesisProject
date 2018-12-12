#!/bin/bash
for i in {1..10}
do
node ./app.js $((3000+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3000+$i))/sensors/connect?port=$((3000))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3010+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3010+$i))/sensors/connect?port=$((3000+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3020+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3020+$i))/sensors/connect?port=$((3010+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3030+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3030+$i))/sensors/connect?port=$((3010+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3040+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3040+$i))/sensors/connect?port=$((3030+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3050+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3050+$i))/sensors/connect?port=$((3000+$i-1))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3060+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3060+$i))/sensors/connect?port=$((3000+$i-1))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3070+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3070+$i))/sensors/connect?port=$((3040+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3080+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3080+$i))/sensors/connect?port=$((3070+$i))&ip=127.0.0.1"
done
for i in {1..10}
do
node ./app.js $((3090+$i)) "127.0.0.1" &
sleep 0.5; curl "http://127.0.0.1:$((3090+$i))/sensors/connect?port=$((3000))&ip=127.0.0.1"
done

