class CryptoHelper {
    static generateSHA256Hash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        return crypto.subtle.digest('SHA-256', dataBuffer)
            .then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            });
    }

    static async encryptDES(message, key, iv) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // Pad the data to be multiple of 8 bytes (DES block size)
        const paddedData = new Uint8Array(Math.ceil(data.length / 8) * 8);
        paddedData.set(data);
        
        // Convert key and iv to CryptoKey
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'DES-CBC' },
            false,
            ['encrypt']
        );
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'DES-CBC',
                iv: iv
            },
            cryptoKey,
            paddedData
        );
        
        return new Uint8Array(encrypted);
    }

    static async decryptDES(encrypted, key, iv) {
        // Convert key to CryptoKey
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'DES-CBC' },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'DES-CBC',
                iv: iv
            },
            cryptoKey,
            encrypted
        );
        
        // Remove padding and convert to string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted).replace(/\0+$/, '');
    }

    static async importPublicKey(pem) {
        // Fetch the part of the PEM string between header and footer
        const pemHeader = "-----BEGIN PUBLIC KEY-----";
        const pemFooter = "-----END PUBLIC KEY-----";
        const pemContents = pem.substring(
            pemHeader.length, 
            pem.length - pemFooter.length
        ).trim();
        
        // Base64 decode the string to get the binary data
        const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
        
        // Import the public key
        return await crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            true,
            ["encrypt"]
        );
    }

    static async encryptRSA(data, publicKey) {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(data);
        
        return await crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            encoded
        );
    }

    static async generateSignature(privateKeyJwk, data) {
        // In a real app, we would use the private key to sign
        // This is a simplified version for demo purposes
        const encoder = new TextEncoder();
        const encoded = encoder.encode(data);
        const hash = await crypto.subtle.digest('SHA-256', encoded);
        return hash;
    }
}