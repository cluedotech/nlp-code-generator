#!/bin/bash

# Script to generate self-signed SSL certificates for local development
# This is useful for testing HTTPS locally without Docker

set -e

CERT_DIR="./ssl"
DAYS_VALID=365

echo "Generating self-signed SSL certificates for development..."

# Create SSL directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key and certificate
openssl req -x509 -nodes -days $DAYS_VALID -newkey rsa:2048 \
    -keyout "$CERT_DIR/nginx-selfsigned.key" \
    -out "$CERT_DIR/nginx-selfsigned.crt" \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Development/CN=localhost"

# Generate Diffie-Hellman parameters
echo "Generating Diffie-Hellman parameters (this may take a while)..."
openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048

echo "✓ SSL certificates generated successfully in $CERT_DIR/"
echo ""
echo "Files created:"
echo "  - $CERT_DIR/nginx-selfsigned.key (private key)"
echo "  - $CERT_DIR/nginx-selfsigned.crt (certificate)"
echo "  - $CERT_DIR/dhparam.pem (DH parameters)"
echo ""
echo "Note: These are self-signed certificates for development only."
echo "Your browser will show a security warning - this is expected."
