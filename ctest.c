/*
  This is a simple test of the size of different crypto keys and the memory
  required to use them.
*/
#include "stdio.h"
#include <auth/cert.h>

#define PublicKey "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCsARn3MQ7Uv1xrMmnHRVi6Ye6H"\
    "u3kxi8HKGjLKu/8CU8WusA3YDX20tiomUmDqHNwUUri7onj/vTD/XGag4bzCym4+"  \
    "k335eFe3Q0dmQ7+vdipb8/y9Ltie8Sko2YUqvBtAWDrJ9ioLQ9BZKejaOPFt7csa"  \
    "BQvE6fkCkqM7qxoS8W9tszCUz2qqD5rV79UY4+HpE80ctcEmPMwiT97QEtHyqVO4"  \
    "gBhBQHemjZSIEfjvzvSwCanVCIhPIG8Vrj/enaaOgTKCSPXgMIzqZ2WrRIr1995k"  \
    "T3nF7aDnUjn2xxtVOjUD1P5ELvRdckXIsHfMfnC1KRJXoDN2s+eYx/lpjLJ7Lgrf"  \
    "Rzrq9Y1B6kfENwGrtbngk1nuJYWvo9Bkwa8nlc9KL7NVC96grnyLTrwYn6lSOPqK"  \
    "1tlvWtambVeB1axD03YxTljJ/MJNuOOf50utxludYNflJIs9oWhKuRsTPcY4ftXf"  \
    "c+okz9HsdDYUGQ2vbsvCL4fk8N7VApDtDnyI8V8m4wOp2YgXYxyjNckYV+ww64Fq"  \
    "bc1vE3PMsadGCfJjyBriybamx/3COCB/9QXNnT5fatZait0gyVb6BNMoJ1Iun/1x"  \
    "fXP+ksdRdOMQg6CBFGz9Fw+ZksXxYT0omGtmGVKngX1cqPXJAWoEVubQVLXDx7ze"  \
    "rIYAmijpIZUtyV9MVw== noname@nos-MacBook-Pro.local"



int main(){
    printf("%lu and the size of the pointers %lu and the size of the actual char is %lu\n", sizeof PublicKey, size_t(char*), size_t(char));
}
