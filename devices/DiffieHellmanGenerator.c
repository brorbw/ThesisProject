/* This program calculates the Key for two persons
using the Diffie-Hellman Key exchange algorithm */
#include<stdio.h>
#include <stdlib.h>
#include<math.h>
#include<gmp.h>
#include <inttypes.h>
#include <time.h>
typedef struct list {
    mpz_t val;
    struct list * next;
} list_t;

int findPrimitive(mpz_t);
void findPrimefactors(list_t*, mpz_t);
void pushList(list_t*, mpz_t);
void initList(list_t*);
list_t* lastList(list_t*);


int main()
{
    mpz_t p;

    unsigned min_digits = 512; //Minimumsize
    unsigned max_digits = 1024;
    unsigned quantity = 1;   // How many numbers do you want?
    unsigned sequence = 1;     // How many numbers before reseeding?

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
    srand(time(NULL));
    num = rand();
    num = (num << 32) | rand();
    num = (num % (999999999 - 100000000)) + 100000000;
    for( unsigned i = 0; i < quantity; i++){

        if(!(i % sequence))
            gmp_randseed_ui(rstate, num);

        do{
            mpz_urandomm(rnum, rstate, rmax);
        }while(mpz_cmp(rnum, rmin) < 0);

    }
    mpz_nextprime(p,rnum);
    gmp_printf("%Zd\n", rnum);

    if(mpz_probab_prime_p(p,20) >= 1){
        printf("Is prime\n");
    }
    findPrimitive(p);

    return 1;
}

int findPrimitive(mpz_t n)
{
    // Find value of Euler Totient function of n
    // Since n is a prime number, the value of Euler
    // Totient function is n-1 as there are n-1
    // relatively prime numbers.
    mpz_t phi;
    mpz_init(phi);
    mpz_sub_ui(phi, n, 1);
    list_t* set;
    initList(set);

    // Find prime factors of phi and store in a set
    findPrimefactors(set, phi);
    /*

    // Check for every number from 2 to phi
    for (int r=2; r<=phi; r++)
    {
        // Iterate through all prime factors of phi.
        // and check if we found a power with value 1
        bool flag = false;
        for (auto it = s.begin(); it != s.end(); it++)
        {

            // Check if r^((phi)/primefactors) mod n
            // is 1 or not
            if (power(r, phi/(*it), n) == 1)
            {
                flag = true;
                break;
            }
         }

         // If there was no power with value 1.
         if (flag == false)
           return r;
    }
    /**
    long long int P, G, x, a, y, b, ka, kb;

    // Both the persons will be agreed upon the
        // public keys G and P
    P = 23; // A prime number P is taken
    printf("The value of P : %lld\n", P);

    G = 9; // A primitve root for P, G is taken
    printf("The value of G : %lld\n\n", G);

    // Alice will choose the private key a
    a = 4; // a is the chosen private key
    printf("The private key a for Alice : %lld\n", a);
    x = power(G, a, P); // gets the generated key

    // Bob will choose the private key b
    b = 3; // b is the chosen private key
    printf("The private key b for Bob : %lld\n\n", b);
    y = power(G, b, P); // gets the generated key

    // Generating the secret key after the exchange
        // of keys
    ka = power(y, a, P); // Secret key for Alice
    kb = power(x, b, P); // Secret key for Bob

    printf("Secret key for the Alice is : %lld\n", ka);
    printf("Secret Key for the Bob is : %lld\n", kb);
    */

    return 0;
}


void findPrimefactors(list_t* list, mpz_t n)
{
  mpz_t mod;
  mpz_init(mod);
  // Print the number of 2s that divide n
  mpz_mod_ui(mod,n,2);
  while (mpz_cmp(mod,0) == 0)
  {
      mpz_mod_ui(mod, n,2);
      mpz_t val,tmp;
      mpz_inits(val,tmp);
      mpz_set_ui(val,2);
      //insert 2
      pushList(list, 2);
      //n=n/val
      mpz_fdiv_q (tmp, n, val);
      n = tmp;
  }

  // n must be odd at this point. So we can skip
  // one element (Note i = i +2)
  mpz_t i, sqrtN,two;
  mpz_inits(i,sqrtN,two);
  mpz_set_ui(i,3);
  mpz_set_ui(two,2);
  mpz_sqrt(sqrtN,n);
  while(mpz_cmp(sqrtN,i) > 0)
  {
      mpz_sqrt(sqrtN,n);
      mpz_mod(mod,n,i);
  // While i divides n, print i and divide n
      while (0 == mpz_cmp(mod,0))
      {
          mpz_mod(mod,n,i);
          pushList(list, i);
          mpz_t tmp;
          mpz_inits(tmp);
          mpz_fdiv_q (tmp, n, i);
          n = tmp;
      }
      mpz_t ttmp;
      mpz_init(ttmp);
      mpz_add_ui(ttmp, n, 2);
      mpz_set(n, ttmp);
  }

  // This condition is to handle the case when
  // n is a prime number greater than 2
  if (mpz_cmp_ui(n, 2) > 0){
      pushList(list, n);
  }
}


void initList(list_t* list){
    list = NULL;
    list = malloc(sizeof(list_t));
    if (list == NULL) {
        printf("Unable to allocate list");
    }
    mpz_t initval;
    mpz_init(initval);
    mpz_set(list->val, initval);
    list->next = NULL;
}

void pushList(list_t * head, mpz_t val) {
    list_t * current = head;
    while (current->next != NULL) {
        current = current->next;
    }
    /* now we can add a new variable */
    current->next = malloc(sizeof(list_t));
    mpz_set(current->next->val, val);
    current->next->next = NULL;
}

list_t* lastList(list_t * head) {
    list_t * current = head;

    while (current != NULL) {
        printf("%d\n", current->val);
        current = current->next;
    }
    return current;
}
