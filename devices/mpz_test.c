#include<stdio.h>
#include <stdlib.h>
#include<gmp.h>
#include <inttypes.h>


int main( int argc, char *argv[]){

    unsigned min_digits = 1000;
    unsigned max_digits = 1024;
    unsigned quantity = 1;   // How many numbers do you want?
    unsigned sequence = 10;     // How many numbers before reseeding?

    mpz_t rmin;
    mpz_init(rmin);
    mpz_ui_pow_ui(rmin, 10, min_digits-1);

    mpz_t rmax;
    mpz_init(rmax);
    mpz_ui_pow_ui(rmax, 10, max_digits);

    gmp_randstate_t rstate;
    gmp_randinit_mt(rstate);

    mpz_t rnum;
    mpz_init(rnum);

    uint64_t num;
    for( unsigned i = 0; i < quantity; i++){
        num = rand();
        num = (num << 32) | rand();

        num = (num % (999999999 - 100000000)) + 100000000;

        if(!(i % sequence)) 
            gmp_randseed_ui(rstate, num);

        do{
            mpz_urandomm(rnum, rstate, rmax);
        }while(mpz_cmp(rnum, rmin) < 0);

        gmp_printf("%Zd\n", rnum);
    }

    return 0;
}
