import { getBPStatus } from '../../constants/theme';
import { subDays } from 'date-fns';

// Rule-based AI recommendation engine (no external API dependency)
// Can be upgraded to OpenAI API by replacing generateRecommendations()

const RULES = {
  // Trend analysis thresholds
  SPIKE_SYSTOLIC: 20,    // mmHg rise considered a spike
  SPIKE_DIASTOLIC: 10,
  CONCERN_DAYS: 3,       // consecutive days of high readings to trigger doctor warning

  // Lifestyle thresholds
  HIGH_SYSTOLIC_THRESHOLD: 130,
  CRISIS_SYSTOLIC_THRESHOLD: 180,
};

// Analyze trend direction over the last N readings
const analyzeTrend = (readings) => {
  if (readings.length < 2) return 'insufficient_data';

  const recent = readings.slice(0, Math.min(5, readings.length));
  const older = readings.slice(Math.min(5, readings.length));

  if (older.length === 0) return 'insufficient_data';

  const recentAvgSys = recent.reduce((s, r) => s + r.systolic, 0) / recent.length;
  const olderAvgSys = older.reduce((s, r) => s + r.systolic, 0) / older.length;

  const diff = recentAvgSys - olderAvgSys;
  if (diff > 8) return 'increasing';
  if (diff < -8) return 'decreasing';
  return 'stable';
};

// Check for consecutive high readings
const checkConsecutiveHigh = (readings) => {
  let count = 0;
  for (const r of readings) {
    const status = getBPStatus(r.systolic, r.diastolic);
    if (status === 'high' || status === 'crisis') {
      count++;
    } else {
      break;
    }
  }
  return count;
};

// Detect spike compared to previous reading
const detectSpike = (readings) => {
  if (readings.length < 2) return false;
  const latest = readings[0];
  const previous = readings[1];
  return (
    latest.systolic - previous.systolic > RULES.SPIKE_SYSTOLIC ||
    latest.diastolic - previous.diastolic > RULES.SPIKE_DIASTOLIC
  );
};

// Get time-based tip
const getTimeBasedTip = (language) => {
  const hour = new Date().getHours();
  const isSpanish = language === 'es';

  if (hour >= 6 && hour < 10) {
    return isSpanish
      ? { category: 'food', text: 'Comienza el día con un desayuno bajo en sodio. Los plátanos y la avena son excelentes para la presión arterial.' }
      : { category: 'food', text: 'Start the day with a low-sodium breakfast. Bananas and oatmeal are excellent for blood pressure.' };
  }
  if (hour >= 10 && hour < 14) {
    return isSpanish
      ? { category: 'hydration', text: 'Recuerda tomar al menos 8 vasos de agua al día. La hidratación adecuada ayuda a mantener la presión arterial estable.' }
      : { category: 'hydration', text: 'Remember to drink at least 8 glasses of water today. Proper hydration helps maintain stable blood pressure.' };
  }
  if (hour >= 14 && hour < 18) {
    return isSpanish
      ? { category: 'exercise', text: 'Una caminata corta de 15 minutos puede ayudar a reducir tu presión arterial. ¡Inténtalo!' }
      : { category: 'exercise', text: 'A short 15-minute walk can help lower your blood pressure. Give it a try!' };
  }
  return isSpanish
    ? { category: 'sleep', text: 'Intenta dormir entre 7 y 8 horas esta noche. El sueño adecuado es esencial para mantener la presión arterial saludable.' }
    : { category: 'sleep', text: 'Aim for 7–8 hours of sleep tonight. Adequate sleep is essential for healthy blood pressure.' };
};

// Rule-based recommendation generator
const getRuleBasedRecommendations = (readings, language) => {
  const isSpanish = language === 'es';
  const recommendations = [];

  if (!readings || readings.length === 0) {
    return [{
      category: 'general',
      text: isSpanish
        ? 'Registra tu primera lectura de presión arterial para recibir consejos personalizados.'
        : 'Log your first blood pressure reading to receive personalized insights.',
      priority: 'low',
    }];
  }

  const latest = readings[0];
  const status = getBPStatus(latest.systolic, latest.diastolic);
  const trend = analyzeTrend(readings);
  const consecutiveHigh = checkConsecutiveHigh(readings);
  const hasSpike = detectSpike(readings);

  // Critical alert
  if (status === 'crisis') {
    recommendations.push({
      category: 'warning',
      text: isSpanish
        ? `Tu presión arterial de ${latest.systolic}/${latest.diastolic} mmHg es peligrosamente alta. Contacta a tu médico o servicios de emergencia inmediatamente.`
        : `Your blood pressure of ${latest.systolic}/${latest.diastolic} mmHg is dangerously high. Contact your doctor or emergency services immediately.`,
      priority: 'critical',
    });
    return recommendations;
  }

  // High reading
  if (status === 'high') {
    recommendations.push({
      category: 'warning',
      text: isSpanish
        ? `Tu presión arterial de ${latest.systolic}/${latest.diastolic} mmHg está elevada. Descansa y evita el estrés por ahora.`
        : `Your blood pressure of ${latest.systolic}/${latest.diastolic} mmHg is elevated. Rest and avoid stress right now.`,
      priority: 'high',
    });
  }

  // Consecutive high readings warning
  if (consecutiveHigh >= RULES.CONCERN_DAYS) {
    recommendations.push({
      category: 'warning',
      text: isSpanish
        ? `Tu presión arterial ha estado elevada durante ${consecutiveHigh} días seguidos. Por favor, contacta a tu médico.`
        : `Your blood pressure has been elevated for ${consecutiveHigh} consecutive days. Please contact your doctor.`,
      priority: 'high',
    });
  }

  // Trend-based recommendations
  if (trend === 'increasing') {
    recommendations.push({
      category: 'general',
      text: isSpanish
        ? 'Tu presión arterial ha aumentado en los últimos días. Reduce el consumo de sal y aumenta la actividad física moderada.'
        : 'Your blood pressure has increased over the last few days. Try reducing salt intake and increasing moderate physical activity.',
      priority: 'medium',
    });
  } else if (trend === 'decreasing') {
    recommendations.push({
      category: 'general',
      text: isSpanish
        ? '¡Excelente tendencia! Tu presión arterial ha disminuido. Sigue con tus hábitos saludables.'
        : 'Great trend! Your blood pressure has been decreasing. Keep up your healthy habits.',
      priority: 'low',
    });
  } else if (trend === 'stable' && status === 'normal') {
    recommendations.push({
      category: 'general',
      text: isSpanish
        ? 'Tu presión arterial se mantiene estable y en rango normal. ¡Sigue así!'
        : 'Your blood pressure is stable and in the normal range. Keep it up!',
      priority: 'low',
    });
  }

  // Spike detection
  if (hasSpike) {
    recommendations.push({
      category: 'stress',
      text: isSpanish
        ? 'Tu presión arterial subió de forma notable comparado con la lectura anterior. Intenta técnicas de relajación como respiración profunda.'
        : 'Your blood pressure rose notably compared to the previous reading. Try relaxation techniques like deep breathing.',
      priority: 'medium',
    });
  }

  // Food recommendation
  recommendations.push({
    category: 'food',
    text: isSpanish
      ? 'Incluye más frutas y verduras en tu dieta. El potasio en plátanos, aguacates y espinacas ayuda a regular la presión arterial.'
      : 'Include more fruits and vegetables in your diet. Potassium in bananas, avocados, and spinach helps regulate blood pressure.',
    priority: 'low',
  });

  // Time-based tip
  const timeTip = getTimeBasedTip(language);
  if (timeTip) {
    recommendations.push({ ...timeTip, priority: 'low' });
  }

  // Disclaimer always included
  recommendations.push({
    category: 'disclaimer',
    text: isSpanish
      ? 'Esta aplicación no reemplaza el consejo médico profesional. Consulta a tu médico antes de cambiar medicamentos.'
      : 'This app does not replace professional medical advice. Consult your doctor before changing medications.',
    priority: 'info',
  });

  // Sort: critical > high > medium > low > info
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  recommendations.sort((a, b) => (order[a.priority] || 3) - (order[b.priority] || 3));

  return recommendations.slice(0, 4); // Return top 4 recommendations
};

// OpenAI-powered recommendations (requires API key)
const getAIRecommendations = async (readings, language, apiKey) => {
  if (!apiKey) return null;

  try {
    const recentReadings = readings.slice(0, 7).map((r) => ({
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      date: r.timestamp,
    }));

    const prompt = language === 'es'
      ? `Eres un asistente de salud. Basándote en estas lecturas de presión arterial: ${JSON.stringify(recentReadings)}, proporciona 3 consejos simples y útiles en español para mejorar la salud del usuario. IMPORTANTE: No diagnostiques enfermedades. Responde en formato JSON: [{"category": "food|exercise|hydration|sleep|stress|general", "text": "consejo"}]`
      : `You are a health assistant. Based on these blood pressure readings: ${JSON.stringify(recentReadings)}, provide 3 simple, helpful health tips. IMPORTANT: Do not diagnose medical conditions. Respond in JSON format: [{"category": "food|exercise|hydration|sleep|stress|general", "text": "tip"}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.map((r) => ({ ...r, priority: 'medium' })) : null;
  } catch {
    return null;
  }
};

// Main recommendation function — tries OpenAI first, falls back to rule-based
export const generateRecommendations = async (readings, language = 'en', openAiApiKey = null) => {
  if (openAiApiKey) {
    const aiRecs = await getAIRecommendations(readings, language, openAiApiKey);
    if (aiRecs && aiRecs.length > 0) {
      return aiRecs;
    }
  }

  return getRuleBasedRecommendations(readings, language);
};

export const getCategoryIcon = (category) => {
  const icons = {
    food: '🥗',
    exercise: '🚶',
    hydration: '💧',
    sleep: '😴',
    stress: '🧘',
    general: '💚',
    warning: '⚠️',
    disclaimer: 'ℹ️',
  };
  return icons[category] || '💚';
};
