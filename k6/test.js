import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 60 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

const messages = [
  "Как записаться на консультацию?",
  "Что такое ЭКО?",
  "Хочу записаться к врачу",
  "Сколько стоит процедура?",
  "Как проходит прием?"
];

export default function () {
  const msg = messages[Math.floor(Math.random() * messages.length)];

  http.post('http://backend:3000/chat', JSON.stringify({
    message: msg
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  sleep(Math.random() * 2);
}
