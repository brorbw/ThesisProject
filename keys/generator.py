#!/usr/local/bin/python3
import secrets
def main():
    f=open("AES-128","w+")
    for i in range(256):
        key = secrets.token_hex(16)
        f.write(str(key) + "\n")
    f.close

if __name__ == "__main__":
    main()
