import { StretchFocus } from '../domain/models.js';

export const seedOfficeActionPackV1 = {
  version: '1.1.0',
  source: 'seed/office-reset',
  actions: [
    action('chin-tuck-wall', 40, false, StretchFocus.POSTURE, 1, 'beginner', 'neck', ['desk', 'posture'], {
      en: {
        title: 'Wall Chin Tuck',
        description: 'Stand against a wall and glide your chin straight back.',
        formCue: 'Keep jaw level and back of head lightly touching the wall.',
        breathingCue: 'Inhale tall, exhale as chin glides back.',
        warning: 'Do not tilt chin upward during the glide.',
        alternative: 'Do seated chin tucks away from wall with smaller range.',
      },
      'zh-TW': {
        title: '靠牆下巴內收',
        description: '背靠牆站立，將下巴水平往後收。',
        formCue: '下顎保持水平，後腦勺輕貼牆。',
        breathingCue: '吸氣拉長，吐氣時下巴往後滑。',
        warning: '不要一邊內收一邊抬下巴。',
        alternative: '可改坐姿，小幅度內收。',
      },
    }),
    action('doorway-pec', 50, true, StretchFocus.POSTURE, 1, 'beginner', 'chest', ['desk', 'upper-body'], {
      en: {
        title: 'Doorway Chest Opener',
        description: 'Place forearm on a door frame and rotate torso forward.',
        formCue: 'Shoulder stays low and ribs stay stacked over hips.',
        breathingCue: 'Long inhale, slow exhale into the stretch.',
        warning: 'Stop if front shoulder feels pinched.',
        alternative: 'Lower elbow below shoulder height to reduce tension.',
      },
      'zh-TW': {
        title: '門框胸口開展',
        description: '前臂扶門框，胸口慢慢往前轉開。',
        formCue: '肩膀下沉，肋骨保持在骨盆正上方。',
        breathingCue: '長吸氣，慢吐氣加深伸展。',
        warning: '前肩夾擠不適時立刻停止。',
        alternative: '把手肘降到肩膀下方降低強度。',
      },
    }),
    action('seated-thoracic-rotation', 45, true, StretchFocus.MOBILITY, 1, 'beginner', 'thoracic', ['desk', 'rotation'], {
      en: {
        title: 'Seated Thoracic Rotation',
        description: 'Sit tall and rotate your rib cage to one side.',
        formCue: 'Keep hips square and move from upper back.',
        breathingCue: 'Inhale center, exhale rotate.',
        warning: 'Avoid twisting from lower back only.',
        alternative: 'Hug a pillow to limit rotation range.',
      },
      'zh-TW': {
        title: '坐姿胸椎旋轉',
        description: '坐直後，將胸廓旋向單側。',
        formCue: '骨盆朝前，旋轉來自上背。',
        breathingCue: '吸氣回中，吐氣旋轉。',
        warning: '避免只用下背硬扭。',
        alternative: '可抱靠枕降低旋轉幅度。',
      },
    }),
    action('seated-hamstring-glide', 50, true, StretchFocus.FLEXIBILITY, 1, 'beginner', 'hamstrings', ['desk', 'legs'], {
      en: {
        title: 'Seated Hamstring Glide',
        description: 'Extend one leg and hinge forward with a long spine.',
        formCue: 'Lead from hips and keep chest broad.',
        breathingCue: 'Exhale fold, inhale lengthen.',
        warning: 'Do not round shoulders aggressively.',
        alternative: 'Bend extended knee slightly.',
      },
      'zh-TW': {
        title: '坐姿腿後滑伸',
        description: '單腳伸直後，從髖折疊前傾。',
        formCue: '從髖啟動，胸口保持打開。',
        breathingCue: '吐氣前傾，吸氣延展。',
        warning: '不要聳肩駝背硬壓。',
        alternative: '伸直腳可微彎膝蓋。',
      },
    }),
    action('standing-calf-wall', 45, true, StretchFocus.RECOVERY, 1, 'beginner', 'calves', ['walking', 'recovery'], {
      en: {
        title: 'Standing Calf Wall Stretch',
        description: 'Hands on wall, step one leg back and press heel down.',
        formCue: 'Back knee stays straight and heel rooted.',
        breathingCue: 'Inhale reset, exhale sink into calf.',
        warning: 'Do not bounce at end range.',
        alternative: 'Bend back knee slightly for soleus focus.',
      },
      'zh-TW': {
        title: '站姿靠牆小腿伸展',
        description: '雙手扶牆，單腳後踩並壓住腳跟。',
        formCue: '後腳膝蓋伸直，腳跟穩定貼地。',
        breathingCue: '吸氣重整，吐氣放鬆小腿。',
        warning: '不要在終點反覆彈震。',
        alternative: '後膝微彎可加強比目魚肌。',
      },
    }),
    action('wrist-prayer', 40, false, StretchFocus.RECOVERY, 1, 'beginner', 'wrists', ['desk', 'typing'], {
      en: {
        title: 'Prayer Wrist Stretch',
        description: 'Press palms together and lower hands slowly.',
        formCue: 'Keep palms touching and shoulders relaxed.',
        breathingCue: 'Steady nasal breathing while holding.',
        warning: 'Avoid forcing into numbness.',
        alternative: 'Stretch one wrist at a time if sensitive.',
      },
      'zh-TW': {
        title: '合掌手腕伸展',
        description: '雙掌合十後，慢慢把手往下沉。',
        formCue: '手掌保持貼合，肩膀放鬆。',
        breathingCue: '停留時維持穩定鼻吸鼻吐。',
        warning: '出現麻感時不要再加壓。',
        alternative: '敏感者可改單側逐步伸展。',
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
