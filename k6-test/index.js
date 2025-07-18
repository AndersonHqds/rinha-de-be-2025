import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50, // virtual users simultâneos
  duration: '30s', // por 30 segundos
};

function uuidv4() {
    // k6 tem seu próprio crypto API limitado
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
  
    // Per RFC4122 variant and version bits
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // version 4
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // variant 10
  
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
    return (
      hex.substring(0, 8) + '-' +
      hex.substring(8, 12) + '-' +
      hex.substring(12, 16) + '-' +
      hex.substring(16, 20) + '-' +
      hex.substring(20)
    );
  }

export default function () {
  const payload = JSON.stringify({
    correlationId: uuidv4(),
    amount: 100,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/payments', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(0.1);
}