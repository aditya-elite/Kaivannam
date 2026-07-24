package main

import (
	"fmt"
	"os"

	"github.com/mohdjishin/crypto/rsautil"
)

var key = rsautil.KeyGeneration()

func main() {

	fmt.Println("1. Generate a private key and a self-signed certificate")
	fmt.Println("2. Load a certificate and extract the public key")
	fmt.Println("3. Sign a message using the private key")
	fmt.Println("4. Validate a signature using the certificate")
	fmt.Println("5. Verify a signature using the public key")
	fmt.Println("6. Save the public key to a file")
	fmt.Println("7. Exit")

	var choice int
	fmt.Scanln(&choice)

	switch choice {
	case 1:
		err := key.GenerateAndSaveKeyPair("privatekey.pem", "certificate.crt", "publickey.pem")
		if err != nil {
			fmt.Printf("Failed to generate and save key pair: %v\n", err)
		}
	case 2:
		err := key.SavePublicKeyToFile("certificate.crt", "publickey_extracted_from_cert.pem")
		if err != nil {
			fmt.Printf("Failed to extract public key: %v\n", err)
		} else {
			fmt.Println("Public key saved to publickey.pem")
		}
	case 3:
		err := key.SignMessageWithPrivateKey("privatekey.pem", "message.txt", "signature.dat")
		if err != nil {
			fmt.Printf("Failed to sign message: %v\n", err)
		} else {
			fmt.Println("Message signed and signature saved to signature.dat")
		}
	case 4:
		err := key.ValidateSignatureWithCertificate("certificate.crt", "message.txt", "signature.dat")
		if err != nil {
			fmt.Printf("Invalid signature: %v\n", err)
		} else {
			fmt.Println("Signature is valid.")
		}
	case 5:
		err := key.VerifySignatureWithPublicKey("publickey.pem", "message.txt", "signature.dat")
		if err != nil {
			fmt.Printf("Failed to verify signature: %v\n", err)
		} else {
			fmt.Println("Signature is valid.")
		}
	case 6:
		err := key.SavePublicKeyToFile("certificate.crt", "publickey.pem")
		if err != nil {
			fmt.Printf("Failed to save public key: %v\n", err)
		} else {
			fmt.Println("Public key saved to publickey.pem")
		}
	case 7:
		fmt.Println("Exiting...")
		return
	default:
		fmt.Println("Invalid choice.")
		os.Exit(1)
	}

}
