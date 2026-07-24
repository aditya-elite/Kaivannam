package rsautil

import (
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"math/big"
	"os"
	"time"

	ipki "github.com/mohdjishin/crypto/Ipki"
)

type PKI struct{}

func KeyGeneration() ipki.IPKI {
	return &PKI{}
}

func saveSignatureToFile(signature []byte, filePath string) error {
	// Create the output file
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Write the signature to the file
	_, err = file.Write(signature)
	if err != nil {
		return err
	}

	return nil
}

func loadSignatureFromFile(filePath string) ([]byte, error) {
	// Read the signature file
	signature, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	return signature, nil
}

func loadCertificate(certificateFile string) (*x509.Certificate, *rsa.PublicKey, error) {

	// Read the certificate file
	certPEM, err := ioutil.ReadFile(certificateFile)
	if err != nil {
		return nil, nil, err
	}

	// Decode the certificate PEM
	block, _ := pem.Decode(certPEM)
	if block == nil || block.Type != "CERTIFICATE" {
		return nil, nil, fmt.Errorf("failed to decode certificate PEM")
	}

	// Parse the certificate
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, nil, err
	}

	// Extract the public key from the certificate
	publicKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return nil, nil, fmt.Errorf("failed to extract RSA public key from certificate")
	}

	return cert, publicKey, nil
}

func (*PKI) SavePublicKeyToFile(certificateFile, filePath string) error {
	// Read the certificate file
	certPEM, err := ioutil.ReadFile(certificateFile)
	if err != nil {
		return err
	}

	// Decode the certificate PEM
	block, _ := pem.Decode(certPEM)
	if block == nil || block.Type != "CERTIFICATE" {
		return fmt.Errorf("failed to decode certificate PEM")
	}

	// Extract the certificate from the PEM block
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return err
	}

	// Extract the public key from the certificate
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(cert.PublicKey)
	if err != nil {
		return err
	}

	// Create a PEM block for the public key
	publicKeyPEM := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	}

	// Create the output file
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Write the public key PEM block to the file
	err = pem.Encode(file, publicKeyPEM)
	if err != nil {
		return err
	}

	return nil
}

func (p *PKI) GenerateAndSaveKeyPair(privateKeyFile, certificateFile, publicKeyFile string) error {
	// Generate a private key
	privateKey, err := rsa.GenerateKey(rand.Reader, 4096) // 4096 is the key size in bits,can also use 2048,1024
	if err != nil {
		return err
	}

	// Create a certificate template
	certTemplate := x509.Certificate{
		SerialNumber: big.NewInt(2019),
		Subject: pkix.Name{
			Organization:  []string{"TEST."},
			Country:       []string{"IN"},
			Province:      []string{""},
			Locality:      []string{"TESTS"},
			StreetAddress: []string{"NIL"},
			PostalCode:    []string{"TEST"},
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().AddDate(10, 0, 0), // 10 years 0 months 0 days
		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Create a self-signed certificate
	certBytes, err := x509.CreateCertificate(rand.Reader, &certTemplate, &certTemplate, &privateKey.PublicKey, privateKey)
	if err != nil {
		return err
	}

	// Encode the private key in PEM format
	privateKeyPEM := new(bytes.Buffer)
	err = pem.Encode(privateKeyPEM, &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})
	if err != nil {
		return err
	}

	// Encode the certificate in PEM format
	certificatePEM := new(bytes.Buffer)
	err = pem.Encode(certificatePEM, &pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certBytes,
	})
	if err != nil {
		return err
	}

	// Save the private key to a file
	err = ioutil.WriteFile(privateKeyFile, privateKeyPEM.Bytes(), 0600)
	if err != nil {
		return err
	}

	// Save the certificate to a file
	err = ioutil.WriteFile(certificateFile, certificatePEM.Bytes(), 0644)
	if err != nil {
		// Cleanup the private key file if saving the certificate failed
		_ = os.Remove(privateKeyFile)
		return err
	}

	// Save the public key to a file
	err = p.SavePublicKeyToFile(certificateFile, publicKeyFile)
	if err != nil {
		// Cleanup the private key and certificate files if saving the public key failed
		_ = os.Remove(privateKeyFile)
		_ = os.Remove(certificateFile)
		return err
	}

	return nil
}

func (p *PKI) SignMessageWithPrivateKey(privateKeyFile, messageFile, signatureFile string) error {
	// Load the private key
	privateKeyPEM, err := ioutil.ReadFile(privateKeyFile)
	if err != nil {
		return err
	}

	// Decode the private key PEM
	block, _ := pem.Decode(privateKeyPEM)
	if block == nil || block.Type != "RSA PRIVATE KEY" {
		return fmt.Errorf("failed to decode private key PEM")
	}

	// Parse the private key
	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return err
	}

	// Read the message file
	message, err := ioutil.ReadFile(messageFile)
	if err != nil {
		return err
	}

	// Sign the message
	signature, err := p.SignMessage(privateKey, message)
	if err != nil {
		return err
	}

	// Save the signature to a file
	err = saveSignatureToFile(signature, signatureFile)
	if err != nil {
		return err
	}

	return nil
}

func (*PKI) ValidateSignatureWithCertificate(certificateFile, messageFile, signatureFile string) error {
	// Load the certificate and public key
	cert, publicKey, err := loadCertificate(certificateFile)
	if err != nil {
		return err
	}

	// Read the message file
	message, err := ioutil.ReadFile(messageFile)
	if err != nil {
		return err
	}

	// Read the signature file
	signature, err := loadSignatureFromFile(signatureFile)
	if err != nil {
		return err
	}

	// Validate the signature
	err = VerifyMessage(publicKey, message, signature)
	if err != nil {
		return err
	}

	// Verify the certificate
	err = cert.CheckSignature(cert.SignatureAlgorithm, cert.RawTBSCertificate, cert.Signature)
	if err != nil {
		return err
	}

	return nil
}

func (*PKI) VerifySignatureWithPublicKey(publicKeyFile, messageFile, signatureFile string) error {
	// Read the public key file
	publicKeyPEM, err := ioutil.ReadFile(publicKeyFile)
	if err != nil {
		return err
	}

	// Decode the public key PEM
	block, _ := pem.Decode(publicKeyPEM)
	if block == nil || block.Type != "PUBLIC KEY" {
		return fmt.Errorf("failed to decode public key PEM")
	}

	// Parse the public key
	publicKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return err
	}

	// Read the message file
	message, err := ioutil.ReadFile(messageFile)
	if err != nil {
		return err
	}

	// Read the signature file
	signature, err := loadSignatureFromFile(signatureFile)
	if err != nil {
		return err
	}

	// Verify the signature
	err = VerifyMessage(publicKey, message, signature)
	if err != nil {
		return err
	}

	return nil
}

func (*PKI) SignMessage(privateKey *rsa.PrivateKey, message []byte) ([]byte, error) {
	hashed := sha256.Sum256(message)
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hashed[:])
	if err != nil {
		return nil, err
	}
	return signature, nil
}

func VerifyMessage(publicKey crypto.PublicKey, message, signature []byte) error {
	hashed := sha256.Sum256(message)
	err := rsa.VerifyPKCS1v15(publicKey.(*rsa.PublicKey), crypto.SHA256, hashed[:], signature)
	if err != nil {
		return err
	}
	return nil
}
