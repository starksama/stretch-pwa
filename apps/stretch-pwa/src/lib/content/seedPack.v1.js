import { StretchFocus } from '../domain/models.js';

export const seedActionPackV1 = {
  version: '1.0.0',
  source: 'seed/local',
  actions: [
    action('neck-release', 45, true, StretchFocus.RECOVERY, 1, 'beginner', 'neck', ['desk', 'recovery'], {
      en: {
        title: 'Neck Release',
        description: 'Sit tall and slowly tilt one ear toward one shoulder.',
        formCue: 'Keep shoulders down and avoid lifting the opposite shoulder.',
        breathingCue: 'Inhale to lengthen spine, exhale as you soften into the stretch.',
        warning: 'Do not pull your head down with force.',
        alternative: 'Do a smaller tilt range while keeping eyes forward.',
      },
      'zh-TW': {
        title: '頸部釋放',
        description: '坐直，慢慢把耳朵靠近同側肩膀。',
        formCue: '肩膀保持放鬆下沉，不要聳肩。',
        breathingCue: '吸氣拉長脊椎，吐氣時再放鬆伸展。',
        warning: '不要用手硬拉頭部。',
        alternative: '先用較小角度，眼睛維持看前方。',
      },
    }),
    action('cat-cow', 60, false, StretchFocus.MOBILITY, 2, 'beginner', 'spine', ['mobility', 'warmup'], {
      en: {
        title: 'Cat-Cow Flow',
        description: 'On hands and knees, alternate arching and rounding your back.',
        formCue: 'Move from pelvis to chest in a smooth wave.',
        breathingCue: 'Inhale in cow, exhale in cat.',
        warning: 'Avoid collapsing shoulders or neck.',
        alternative: 'Perform seated cat-cow if wrists are sensitive.',
      },
      'zh-TW': {
        title: '貓牛式流動',
        description: '四足跪姿，交替做拱背與圓背。',
        formCue: '從骨盆到胸口連續帶動，不要僵硬停住。',
        breathingCue: '牛式吸氣，貓式吐氣。',
        warning: '避免肩膀塌陷或脖子過度緊繃。',
        alternative: '手腕不適可改成坐姿貓牛。',
      },
    }),
    action('hip-flexor-lunge', 60, true, StretchFocus.FLEXIBILITY, 2, 'intermediate', 'hips', ['hips', 'posture'], {
      en: {
        title: 'Hip Flexor Lunge',
        description: 'Step into a half-kneeling lunge and gently shift hips forward.',
        formCue: 'Tuck pelvis slightly and keep rib cage stacked over hips.',
        breathingCue: 'Long inhale through nose, slow exhale to release front hip.',
        warning: 'Do not over-arch lower back.',
        alternative: 'Keep hands on a chair for extra balance.',
      },
      'zh-TW': {
        title: '髖屈肌弓箭步',
        description: '半跪弓箭步，骨盆輕輕往前推。',
        formCue: '骨盆微後傾，肋骨疊在骨盆上方。',
        breathingCue: '鼻吸延長，慢吐放鬆髖前側。',
        warning: '不要過度腰椎後仰。',
        alternative: '雙手扶椅子增加穩定。',
      },
    }),
    action('hamstring-fold', 60, false, StretchFocus.FLEXIBILITY, 2, 'beginner', 'hamstrings', ['legs', 'recovery'], {
      en: {
        title: 'Hamstring Fold',
        description: 'Hinge at hips and fold forward with soft knees.',
        formCue: 'Lengthen chest forward before lowering deeper.',
        breathingCue: 'Exhale as you fold, inhale to create length.',
        warning: 'Do not lock knees.',
        alternative: 'Use blocks under hands to reduce depth.',
      },
      'zh-TW': {
        title: '腿後側前彎',
        description: '從髖關節折疊前彎，膝蓋保持微彎。',
        formCue: '先延長胸口再往下，不要直接駝背下壓。',
        breathingCue: '吐氣前彎，吸氣時延展脊椎。',
        warning: '避免膝蓋打直鎖死。',
        alternative: '手放瑜伽磚減少深度。',
      },
    }),
    action('thoracic-open-book', 50, true, StretchFocus.POSTURE, 2, 'beginner', 'thoracic', ['rotation', 'posture'], {
      en: {
        title: 'Open Book Twist',
        description: 'Lie on side and rotate top arm open across body.',
        formCue: 'Keep knees stacked and movement from upper back.',
        breathingCue: 'Inhale open, exhale hold and relax.',
        warning: 'Do not force shoulder to the floor.',
        alternative: 'Place pillow under opening arm for support.',
      },
      'zh-TW': {
        title: '開書式旋轉',
        description: '側躺將上方手臂向後打開旋轉。',
        formCue: '膝蓋保持疊放，旋轉來自胸椎。',
        breathingCue: '打開時吸氣，停留時吐氣放鬆。',
        warning: '不要硬壓肩膀貼地。',
        alternative: '可在手臂下墊枕頭支撐。',
      },
    }),
    action('child-pose-lat', 60, true, StretchFocus.RECOVERY, 1, 'beginner', 'lats', ['recovery', 'back'], {
      en: {
        title: 'Child Pose Lat Reach',
        description: 'In child pose, walk both hands to one side to target lats.',
        formCue: 'Keep hips grounded toward heels while reaching long.',
        breathingCue: 'Breathe into side ribs where stretch is felt.',
        warning: 'Do not hold breath in deep reach.',
        alternative: 'Use cushion under hips if knees feel tight.',
      },
      'zh-TW': {
        title: '嬰兒式闊背伸展',
        description: '嬰兒式下，雙手往同側走拉伸闊背。',
        formCue: '臀部保持往腳跟，手臂向前延伸。',
        breathingCue: '把呼吸送到有拉伸感的側肋。',
        warning: '深伸展時不要憋氣。',
        alternative: '膝緊可在臀下墊靠墊。',
      },
    }),
    action('figure-four', 55, true, StretchFocus.MOBILITY, 2, 'intermediate', 'glutes', ['hips', 'glutes'], {
      en: {
        title: 'Figure Four Stretch',
        description: 'Cross ankle over opposite thigh and draw legs inward.',
        formCue: 'Keep crossed ankle flexed to protect knee.',
        breathingCue: 'Exhale as legs come closer, inhale to reset.',
        warning: 'Avoid pulling directly on knee joint.',
        alternative: 'Do seated figure-four if lying version is too intense.',
      },
      'zh-TW': {
        title: '四字臀部伸展',
        description: '腳踝跨在對側大腿，雙腿往胸口靠近。',
        formCue: '跨上的腳踝保持勾腳，保護膝蓋。',
        breathingCue: '吐氣時拉近，吸氣時微放鬆。',
        warning: '不要直接拉扯膝關節。',
        alternative: '強度太高可改坐姿四字伸展。',
      },
    }),
    action('wall-pec', 45, true, StretchFocus.POSTURE, 1, 'beginner', 'chest', ['posture', 'upper-body'], {
      en: {
        title: 'Wall Pec Opener',
        description: 'Place forearm on wall and rotate chest away gently.',
        formCue: 'Shoulder stays down and neck stays long.',
        breathingCue: 'Slow inhale through nose, long exhale while rotating.',
        warning: 'Do not push into sharp front-shoulder pain.',
        alternative: 'Lower elbow height to reduce intensity.',
      },
      'zh-TW': {
        title: '靠牆胸肌開展',
        description: '前臂貼牆，胸口慢慢往外旋開。',
        formCue: '肩膀下沉，頸部保持放鬆延長。',
        breathingCue: '鼻吸慢吐，吐氣時再微旋轉。',
        warning: '前肩若出現刺痛請立刻減量。',
        alternative: '把手肘放低可降低強度。',
      },
    }),
    action('ankle-rock', 40, true, StretchFocus.MOBILITY, 1, 'beginner', 'ankles', ['mobility', 'running'], {
      en: {
        title: 'Ankle Dorsiflexion Rock',
        description: 'In a split stance, drive front knee gently over toes.',
        formCue: 'Keep front heel grounded and knee tracking over second toe.',
        breathingCue: 'Inhale to reset, exhale as you glide forward.',
        warning: 'Do not let heel lift off the floor.',
        alternative: 'Reduce range and hold onto wall support.',
      },
      'zh-TW': {
        title: '踝背屈前推',
        description: '前後站姿，前膝溫和往腳尖方向推進。',
        formCue: '前腳跟貼地，膝蓋對準第二腳趾。',
        breathingCue: '吸氣回正，吐氣再往前推。',
        warning: '避免前腳跟離地。',
        alternative: '先縮小幅度並扶牆穩定。',
      },
    }),
    action('wrist-extensor', 40, true, StretchFocus.RECOVERY, 1, 'beginner', 'wrists', ['desk', 'recovery'], {
      en: {
        title: 'Wrist Extensor Stretch',
        description: 'Extend one arm and gently flex wrist downward with other hand.',
        formCue: 'Keep elbow straight but soft, shoulder relaxed.',
        breathingCue: 'Slow inhale, long exhale as forearm releases.',
        warning: 'Avoid sharp tingling or numbness.',
        alternative: 'Do light circles if static stretch feels intense.',
      },
      'zh-TW': {
        title: '手腕伸肌伸展',
        description: '單手前伸，另一手輕壓手背向下。',
        formCue: '手肘伸直但不鎖死，肩膀保持放鬆。',
        breathingCue: '慢吸氣，長吐氣讓前臂放鬆。',
        warning: '若有刺麻感請立刻減量。',
        alternative: '若靜態拉伸太強可改做小幅畫圈。',
      },
    }),
    action('supine-twist', 55, true, StretchFocus.RECOVERY, 1, 'beginner', 'lower-back', ['recovery', 'spine'], {
      en: {
        title: 'Supine Twist',
        description: 'Lie on back, drop bent knees to one side and open arms.',
        formCue: 'Keep shoulders broad and let knees fall by gravity.',
        breathingCue: 'Inhale into belly, exhale to soften spine.',
        warning: 'Do not force knees to floor.',
        alternative: 'Place pillow under knees for support.',
      },
      'zh-TW': {
        title: '仰躺脊椎扭轉',
        description: '仰躺屈膝，雙膝倒向一側，雙臂打開。',
        formCue: '肩膀放寬貼地，讓膝蓋自然下落。',
        breathingCue: '吸氣進入腹部，吐氣放鬆脊椎。',
        warning: '不要硬壓膝蓋貼地。',
        alternative: '膝下可墊枕頭支撐。',
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
