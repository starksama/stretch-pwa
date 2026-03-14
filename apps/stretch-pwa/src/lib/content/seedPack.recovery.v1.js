import { StretchFocus } from '../domain/models.js';

export const seedRecoveryActionPackV1 = {
  version: '1.2.0',
  source: 'seed/recovery-night',
  actions: [
    action('diaphragm-90-90', 60, false, StretchFocus.RECOVERY, 1, 'beginner', 'core', ['breathing', 'recovery'], {
      en: {
        title: '90/90 Diaphragm Breathing',
        description: 'Lie on your back with feet elevated and hands on lower ribs.',
        formCue: 'Keep jaw soft and let ribs expand sideways.',
        breathingCue: 'Inhale for 4, exhale for 6 through relaxed lips.',
        warning: 'Do not force deep breaths if dizzy.',
        alternative: 'Keep feet on floor if hips feel tight.',
      },
      'zh-TW': {
        title: '90/90 橫膈呼吸',
        description: '仰躺抬腳，雙手放在下肋骨感受呼吸。',
        formCue: '下巴放鬆，肋骨向兩側擴張。',
        breathingCue: '吸氣 4 秒、吐氣 6 秒，嘴唇放鬆。',
        warning: '若頭暈不要勉強深呼吸。',
        alternative: '髖緊可改雙腳踩地。',
      },
    }),
    action('supine-hamstring-strap', 55, true, StretchFocus.FLEXIBILITY, 1, 'beginner', 'hamstrings', ['recovery', 'legs'], {
      en: {
        title: 'Supine Hamstring Strap',
        description: 'On your back, loop a strap around one foot and extend leg up.',
        formCue: 'Keep opposite thigh heavy on the mat.',
        breathingCue: 'Exhale as the lifted leg lengthens.',
        warning: 'Avoid locking the raised knee hard.',
        alternative: 'Hold behind thigh without a strap.',
      },
      'zh-TW': {
        title: '仰躺帶子腿後伸展',
        description: '仰躺後用帶子套住腳掌，單腳向上伸直。',
        formCue: '另一側大腿保持穩定貼地。',
        breathingCue: '吐氣時讓抬高腿更延長。',
        warning: '不要把抬高側膝蓋鎖死。',
        alternative: '沒有帶子可改抱大腿後側。',
      },
    }),
    action('thread-the-needle-floor', 50, true, StretchFocus.MOBILITY, 1, 'beginner', 'shoulders', ['recovery', 'upper-body'], {
      en: {
        title: 'Thread the Needle',
        description: 'From all fours, slide one arm under and rotate through upper back.',
        formCue: 'Push gently through support hand to create space.',
        breathingCue: 'Inhale prepare, exhale rotate and settle.',
        warning: 'Do not dump weight into neck.',
        alternative: 'Place a cushion under shoulder for support.',
      },
      'zh-TW': {
        title: '穿針式旋轉',
        description: '四足跪姿下，單手穿過身體做上背旋轉。',
        formCue: '支撐手輕推地面，保留肩頸空間。',
        breathingCue: '吸氣準備，吐氣旋轉停留。',
        warning: '不要把重量壓在脖子上。',
        alternative: '肩下可墊靠墊增加支撐。',
      },
    }),
    action('couch-quad-soft', 50, true, StretchFocus.FLEXIBILITY, 2, 'intermediate', 'quads', ['recovery', 'hips'], {
      en: {
        title: 'Soft Couch Quad Stretch',
        description: 'Kneel near wall/couch and gently open front thigh.',
        formCue: 'Squeeze glute on kneeling side to protect lower back.',
        breathingCue: 'Long exhale to reduce thigh tension.',
        warning: 'Stop if knee feels compressed.',
        alternative: 'Move knee farther from wall to reduce angle.',
      },
      'zh-TW': {
        title: '柔和沙發股四頭伸展',
        description: '靠牆或沙發半跪，溫和拉開大腿前側。',
        formCue: '半跪側臀部微出力，避免腰椎代償。',
        breathingCue: '長吐氣降低大腿前側緊繃。',
        warning: '膝蓋受壓不適請立即停止。',
        alternative: '把膝蓋往前移可降低角度。',
      },
    }),
    action('legs-up-wall', 70, false, StretchFocus.RECOVERY, 1, 'beginner', 'circulation', ['recovery', 'calm'], {
      en: {
        title: 'Legs Up the Wall',
        description: 'Lie close to a wall and rest both legs vertically.',
        formCue: 'Soften lower ribs and let shoulders melt down.',
        breathingCue: 'Slow nasal breathing with longer exhales.',
        warning: 'Exit slowly if you feel pressure in head.',
        alternative: 'Bend knees and rest calves on a chair.',
      },
      'zh-TW': {
        title: '抬腿靠牆放鬆',
        description: '身體靠牆仰躺，雙腿自然向上放置。',
        formCue: '下肋放鬆，肩膀自然沉下。',
        breathingCue: '鼻吸鼻吐，吐氣稍微延長。',
        warning: '若頭部壓力感明顯請慢慢離開姿勢。',
        alternative: '可改把小腿放在椅子上。',
      },
    }),
    action('box-breath-settle', 60, false, StretchFocus.RECOVERY, 1, 'beginner', 'nervous-system', ['breathing', 'sleep'], {
      en: {
        title: 'Box Breathing Settle',
        description: 'Sit or lie comfortably and follow equal breath counts.',
        formCue: 'Keep shoulders relaxed and tongue off the roof of mouth.',
        breathingCue: 'Inhale 4, hold 4, exhale 4, hold 4.',
        warning: 'Skip breath holds if anxious or uncomfortable.',
        alternative: 'Use 4-in / 6-out without holds.',
      },
      'zh-TW': {
        title: '方形呼吸安定',
        description: '舒適坐姿或躺姿，跟隨等長呼吸節奏。',
        formCue: '肩頸放鬆，舌頭不要頂住上顎。',
        breathingCue: '吸 4 秒、停 4 秒、吐 4 秒、停 4 秒。',
        warning: '若焦慮或不適可省略停頓。',
        alternative: '改為吸 4 秒、吐 6 秒。',
      },
    }),
  ],
};

function action(id, durationSec, sideAware, focus, intensity, difficulty, bodyArea, tags, instructions) {
  return {
    id,
    durationSec,
    sideAware,
    focus,
    intensity,
    instructions,
    quality: {
      difficulty,
      bodyArea,
      tags,
    },
  };
}
