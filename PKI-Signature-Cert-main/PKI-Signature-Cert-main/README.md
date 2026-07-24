# RSA Certificate Operations

This is a Go program that demonstrates various RSA certificate operations using the `crypto/rsa` package.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mohdjishin/PKI-Signature-Cert.git
   ```

2. change directory to the cloned repository:
   ```bash
   cd PKI-Signature-Cert
   ```
3. Run the program:
   ```bash
    go run *.go
    ```
4. This Go program allows you to perform RSA certificate operations. It provides options to generate a private key and self-signed certificate, extract the public key from a certificate, sign a message using a private key, validate a signature using a certificate, verify a signature using a public key, and save the public key to a file. Each option performs a specific task and provides feedback on the success or failure of the operation. It's a versatile program that can be customized and extended for various cryptographic tasks involving RSA certificates.
## Usage
1. Generate a private key and a self-signed certificate
2. Load a certificate and extract the public key
3. Sign a message using the private key
4. Validate a signature using the certificate
5. Verify a signature using the public key
6. Save the public key to a file
7. Exit

Choose an option by entering the corresponding number.
