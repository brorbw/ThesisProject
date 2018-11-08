from Crypto.PublicKey import RSA
import rsa

def main(arg):
    f = open(arg[0])
    key = RSA.importKey(f.read())

    modulus = key.n
    public_exponent = key.e
    private_exponent = key.d
    first_prime_number = key.p
    second_prime_number = key.q
    q_inv_crt = key.u

    myString = 'Key Values:'
    myString += '\nModulus (n): length:' + str(len(str(modulus)))+ '\n' + str(modulus)
    myString += '\nPublic exponent (e): length:'+ str(len(str(public_exponent))) + '\n'+ str(public_exponent)
    myString += '\nPrivate exponent (d): length:' + str(len(str(private_exponent))) + '\n' + str(private_exponent)
    myString += '\nFirst prime number (p): length:' + str(len(str(first_prime_number))) + '\n' + str(first_prime_number)
    myString += '\nSecond prime number (q): length:' + str(len(str(second_prime_number))) + '\n' + str(second_prime_number)
    myString += '\nq_inv_crt (u):' + str(q_inv_crt)

    print(myString)




if __name__ == "__main__":
    import sys
    main(sys.argv[1:])
