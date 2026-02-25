import dayjs from 'dayjs';

export const formatDate = (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-';

export const formatMoney = (amount, currency = 'USD') => {
  if (amount == null) return '-';
  return `${Number(amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currency}`;
};

export const formatM3 = (val) => {
  if (val == null) return '-';
  return `${Number(val).toFixed(4)} m³`;
};

export const calcM3PerPiece = (thickness, width, length) => {
  return (thickness * width * length) / 1e6;
};

export const statusColors = {
  kelyapti: 'processing',
  faol: 'success',
  omborda: 'warning',
  sotildi: 'default'
};

export const statusLabels = {
  kelyapti: 'Kelyapti',
  faol: 'Faol',
  omborda: 'Omborda',
  sotildi: 'Sotildi'
};
