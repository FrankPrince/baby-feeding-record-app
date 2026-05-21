function pad2(value) {
  return String(value).padStart(2, '0');
}

function combineBirthDateTime(birthDate, birthTime) {
  if (!birthDate || !birthTime) {
    return null;
  }

  const normalizedTime = birthTime.length === 5 ? `${birthTime}:00` : birthTime;
  return `${birthDate}T${normalizedTime}`;
}

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

function calculateAge(options) {
  const birthDateTime = combineBirthDateTime(options.birthDate, options.birthTime);

  if (!birthDateTime) {
    return {
      canCalculate: false,
      reason: 'missing_birth_datetime',
      dayAge: null,
      hoursAfterBirth: null
    };
  }

  const birth = toDate(birthDateTime);
  const now = toDate(options.now || new Date());
  const diffMs = now.getTime() - birth.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return {
      canCalculate: false,
      reason: 'invalid_birth_datetime',
      dayAge: null,
      hoursAfterBirth: null
    };
  }

  const hoursAfterBirth = Math.floor(diffMs / 3600000);

  return {
    canCalculate: true,
    reason: null,
    dayAge: Math.floor(diffMs / 86400000) + 1,
    hoursAfterBirth
  };
}

function formatDate(date) {
  const value = toDate(date);
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function formatTime(date) {
  const value = toDate(date);
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

module.exports = {
  combineBirthDateTime,
  calculateAge,
  formatDate,
  formatTime
};
