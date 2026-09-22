#!/usr/bin/env bash
# ============================================================
# k8s/create-tls-secret.sh - إنشاء Secret شهادة TLS من deploy/ssl
# بيئة: الإنتاج (Production)
# الاستخدام: ./deploy/k8s/create-tls-secret.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="${SCRIPT_DIR}/../ssl"

CERT="${SSL_DIR}/fullchain.pem"
KEY="${SSL_DIR}/privkey.pem"

if [[ ! -f "${CERT}" || ! -f "${KEY}" ]]; then
  echo "لا توجد شهادة في ${SSL_DIR}. يجب وجود fullchain.pem و privkey.pem." >&2
  echo "للبيئات التجريبية يمكن توليد شهادة ذاتية:"
  echo "  openssl req -x509 -newkey rsa:4096 -nodes -days 365 \\"
  echo "    -keyout ${KEY} -out ${CERT} -subj '/CN=nqp.gov.sd' \\"
  echo "    -addext 'subjectAltName=DNS:nqp.gov.sd,DNS:api.nqp.gov.sd,DNS:www.nqp.gov.sd'" >&2
  exit 1
fi

# حذف أي Secret سابق (تحديث دون تعارض)
kubectl delete secret nqp-tls --namespace=nqp --ignore-not-found=true

kubectl create secret tls nqp-tls \
  --namespace=nqp \
  --cert="${CERT}" \
  --key="${KEY}"

echo "تم إنشاء Secret: nqp-tls (namespace: nqp)"