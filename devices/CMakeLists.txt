cmake_minimum_required(VERSION 3.12)
project(devices C)

set(CMAKE_C_STANDARD 11)


set (CMAKE_C_FLAGS "-lgmp -lstdc++ -march=x86-64")

include_directories(spark_particle/TestRSA/lib/tropicssl/include)
include_directories(spark_particle/TestRSA/lib/tropicssl/include/tropicssl)

add_executable(devices
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/aes.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/bignum.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/bn_mul.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/config.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/padlock.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/rsa.h
        spark_particle/TestRSA/lib/tropicssl/include/tropicssl/sha1.h
        spark_particle/TestRSA/lib/tropicssl/library/aes.c
        spark_particle/TestRSA/lib/tropicssl/library/bignum.c
        spark_particle/TestRSA/lib/tropicssl/library/padlock.c
        spark_particle/TestRSA/lib/tropicssl/library/rsa.c
        spark_particle/TestRSA/lib/tropicssl/library/sha1.c
        DiffieHellmanGenerator.c)
