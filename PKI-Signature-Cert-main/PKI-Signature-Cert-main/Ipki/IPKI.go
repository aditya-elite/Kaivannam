package ipki

import "crypto/rsa"

type IPKI interface {
	SavePublicKeyToFile(string, string) error
	GenerateAndSaveKeyPair(string, string, string) error
	SignMessageWithPrivateKey(string, string, string) error
	ValidateSignatureWithCertificate(string, string, string) error
	VerifySignatureWithPublicKey(string, string, string) error
	SignMessage(*rsa.PrivateKey, []byte) ([]byte, error)
}
