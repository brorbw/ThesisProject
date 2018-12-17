for j in {1..10} 
do 
for i in {1..10} 
do 
curl "http://192.168.87.101:$((3000+$i))/requestPairKey?port=$((3010+$j))&ip=192.168.87.101"; sleep 1 
done 
done
