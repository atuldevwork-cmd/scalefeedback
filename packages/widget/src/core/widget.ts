import { record } from 'rrweb';
import type { WidgetConfig, FeedbackType, AnnotationTool } from '../types';
import { captureScreenshot } from '../capture/screenshot';
import { detectExtension, captureFullPageViaExtension } from '../capture/extension-bridge';
import { ConsoleCapture } from '../capture/console';
import { NetworkCapture } from '../capture/network';
import { collectMetadata } from '../capture/metadata';
import { AnnotationCanvas } from '../annotation/canvas';
import { submitFeedback, shareSnapshot, improveFeedbackText } from './api';
import widgetStyles from '../ui/styles.css?inline';

const HOST_ID = 'pinmarks-widget';
const SF_GUEST_KEY = 'sf_guest_identity';

// [emoji, searchable name] — used to render the full emoji picker grid and
// to filter it as the user types in the picker's search box.
const EMOJI_DATA: [string, string][] = [
  ['😀', 'grinning'], ['😃', 'smiley'], ['😄', 'smile'], ['😁', 'grin'],
  ['😆', 'laughing'], ['😅', 'sweat smile'], ['🤣', 'rofl'], ['😂', 'joy'],
  ['🙂', 'slightly smiling'], ['🙃', 'upside down'], ['😉', 'wink'], ['😊', 'blush'],
  ['😇', 'innocent'], ['🥰', 'smiling hearts'], ['😍', 'heart eyes'], ['🤩', 'star struck'],
  ['😘', 'kiss'], ['😗', 'kissing'], ['😚', 'kissing closed eyes'], ['😙', 'kissing smiling eyes'],
  ['😋', 'yum'], ['😛', 'tongue'], ['😜', 'winking tongue'], ['🤪', 'zany'],
  ['😝', 'squinting tongue'], ['🤑', 'money mouth'], ['🤗', 'hugging'], ['🤭', 'hand over mouth'],
  ['🤫', 'shushing'], ['🤔', 'thinking'], ['🤐', 'zipper mouth'], ['🤨', 'raised eyebrow'],
  ['😐', 'neutral'], ['😑', 'expressionless'], ['😶', 'no mouth'], ['😏', 'smirk'],
  ['😒', 'unamused'], ['🙄', 'rolling eyes'], ['😬', 'grimacing'], ['🤥', 'lying'],
  ['😌', 'relieved'], ['😔', 'pensive'], ['😪', 'sleepy'], ['🤤', 'drooling'],
  ['😴', 'sleeping'], ['😷', 'mask'], ['🤒', 'thermometer'], ['🤕', 'head bandage'],
  ['🤢', 'nauseated'], ['🤮', 'vomiting'], ['🤧', 'sneezing'], ['🥵', 'hot'],
  ['🥶', 'cold'], ['🥴', 'woozy'], ['😵', 'dizzy'], ['🤯', 'exploding head'],
  ['🤠', 'cowboy'], ['🥳', 'partying'], ['🥸', 'disguised'], ['😎', 'sunglasses'],
  ['🤓', 'nerd'], ['🧐', 'monocle'], ['😕', 'confused'], ['😟', 'worried'],
  ['🙁', 'slightly frowning'], ['😮', 'open mouth'], ['😯', 'hushed'], ['😲', 'astonished'],
  ['😳', 'flushed'], ['🥺', 'pleading'], ['😦', 'frowning'], ['😧', 'anguished'],
  ['😨', 'fearful'], ['😰', 'anxious sweat'], ['😥', 'sad relieved'], ['😢', 'cry'],
  ['😭', 'sob'], ['😱', 'scream'], ['😖', 'confounded'], ['😣', 'persevering'],
  ['😞', 'disappointed'], ['😓', 'downcast sweat'], ['😩', 'weary'], ['😫', 'tired'],
  ['🥱', 'yawning'], ['😤', 'triumph'], ['😡', 'rage'], ['😠', 'angry'],
  ['🤬', 'cursing'], ['😈', 'smiling imp'], ['👿', 'imp'], ['💀', 'skull'],
  ['💩', 'poop'], ['🤡', 'clown'], ['👻', 'ghost'], ['👽', 'alien'],
  ['🤖', 'robot'], ['😺', 'cat smile'], ['😻', 'cat heart eyes'], ['😼', 'cat smirk'],
  ['👋', 'wave'], ['🤚', 'raised back of hand'], ['🖐️', 'hand'], ['✋', 'raised hand'],
  ['👌', 'ok hand'], ['🤌', 'pinched fingers'], ['✌️', 'victory'], ['🤞', 'crossed fingers'],
  ['🤟', 'love you gesture'], ['🤘', 'rock on'], ['👈', 'point left'], ['👉', 'point right'],
  ['👆', 'point up'], ['👇', 'point down'], ['👍', 'thumbs up'], ['👎', 'thumbs down'],
  ['✊', 'fist'], ['👊', 'punch'], ['🤛', 'left fist'], ['🤜', 'right fist'],
  ['👏', 'clap'], ['🙌', 'raised hands'], ['👐', 'open hands'], ['🤲', 'palms up'],
  ['🙏', 'pray'], ['💪', 'muscle'], ['🖖', 'vulcan'], ['👀', 'eyes'],
  ['👁️', 'eye'], ['🧠', 'brain'], ['🦷', 'tooth'], ['👂', 'ear'],
  ['💯', '100'], ['💥', 'boom'], ['💫', 'dizzy star'], ['💦', 'sweat drops'],
  ['💨', 'dash'], ['🕳️', 'hole'], ['💣', 'bomb'], ['💬', 'speech balloon'],
  ['👤', 'bust'], ['🔥', 'fire'], ['✨', 'sparkles'], ['🎉', 'party'],
  ['🎊', 'confetti ball'], ['🎈', 'balloon'], ['🎁', 'gift'], ['🏆', 'trophy'],
  ['🥇', 'gold medal'], ['⭐', 'star'], ['🌟', 'glowing star'], ['⚡', 'lightning'],
  ['☀️', 'sun'], ['🌈', 'rainbow'], ['☁️', 'cloud'], ['❄️', 'snowflake'],
  ['✅', 'check mark'], ['☑️', 'check box'], ['✔️', 'heavy check'], ['❌', 'cross mark'],
  ['❎', 'cross mark button'], ['⭕', 'circle'], ['🚫', 'no entry'], ['⚠️', 'warning'],
  ['❓', 'question'], ['❗', 'exclamation'], ['💡', 'bulb'], ['🔒', 'lock'],
  ['🔓', 'unlock'], ['🔑', 'key'], ['🔍', 'magnifying glass'], ['📌', 'pin'],
  ['📎', 'paperclip'], ['🔗', 'link'], ['🛠️', 'tools'], ['⚙️', 'gear'],
  ['🐛', 'bug'], ['🚀', 'rocket'], ['⏰', 'alarm clock'], ['⏳', 'hourglass'],
  ['📅', 'calendar'], ['📈', 'chart up'], ['📉', 'chart down'], ['💻', 'laptop'],
  ['📱', 'mobile'], ['🖥️', 'desktop'], ['❤️', 'red heart'], ['🧡', 'orange heart'],
  ['💛', 'yellow heart'], ['💚', 'green heart'], ['💙', 'blue heart'], ['💜', 'purple heart'],
  ['🖤', 'black heart'], ['🤍', 'white heart'], ['🤎', 'brown heart'], ['💔', 'broken heart'],
  ['❣️', 'heart exclamation'], ['💕', 'two hearts'], ['💞', 'revolving hearts'], ['💓', 'beating heart'],
  ['💗', 'growing heart'], ['💖', 'sparkling heart'], ['💘', 'heart arrow'], ['💝', 'heart ribbon'],
  ['🤝', 'handshake'], ['✍️', 'writing hand'], ['💅', 'nail care'], ['🤳', 'selfie'],
  ['🐶', 'dog'], ['🐱', 'cat'], ['🐭', 'mouse'], ['🐹', 'hamster'],
  ['🐰', 'rabbit'], ['🦊', 'fox'], ['🐻', 'bear'], ['🐼', 'panda'],
  ['🐨', 'koala'], ['🐯', 'tiger'], ['🦁', 'lion'], ['🐮', 'cow'],
  ['🐷', 'pig'], ['🐸', 'frog'], ['🐵', 'monkey'], ['🐔', 'chicken'],
  ['🐧', 'penguin'], ['🐦', 'bird'], ['🐤', 'baby chick'], ['🦆', 'duck'],
  ['🦅', 'eagle'], ['🦉', 'owl'], ['🦇', 'bat'], ['🐺', 'wolf'],
  ['🐗', 'boar'], ['🐴', 'horse'], ['🦄', 'unicorn'], ['🐝', 'bee'],
  ['🐛', 'caterpillar'], ['🦋', 'butterfly'], ['🐌', 'snail'], ['🐞', 'ladybug'],
  ['🐜', 'ant'], ['🦟', 'mosquito'], ['🕷️', 'spider'], ['🕸️', 'spider web'],
  ['🐢', 'turtle'], ['🐍', 'snake'], ['🦎', 'lizard'], ['🦖', 't-rex'],
  ['🐙', 'octopus'], ['🦑', 'squid'], ['🦐', 'shrimp'], ['🦀', 'crab'],
  ['🐡', 'blowfish'], ['🐠', 'tropical fish'], ['🐟', 'fish'], ['🐬', 'dolphin'],
  ['🐳', 'whale'], ['🦈', 'shark'], ['🐊', 'crocodile'], ['🐅', 'tiger2'],
  ['🦓', 'zebra'], ['🦍', 'gorilla'], ['🐘', 'elephant'], ['🦛', 'hippo'],
  ['🐪', 'camel'], ['🦒', 'giraffe'], ['🐐', 'goat'], ['🦌', 'deer'],
  ['🐕', 'dog2'], ['🐩', 'poodle'], ['🐈', 'cat2'], ['🐓', 'rooster'],
  ['🦃', 'turkey'], ['🦚', 'peacock'], ['🦜', 'parrot'], ['🦢', 'swan'],
  ['🐇', 'rabbit2'], ['🦔', 'hedgehog'], ['🐁', 'mouse2'], ['🐀', 'rat'],
  ['🍏', 'green apple'], ['🍎', 'red apple'], ['🍐', 'pear'], ['🍊', 'tangerine'],
  ['🍋', 'lemon'], ['🍌', 'banana'], ['🍉', 'watermelon'], ['🍇', 'grapes'],
  ['🍓', 'strawberry'], ['🫐', 'blueberries'], ['🍈', 'melon'], ['🍒', 'cherries'],
  ['🍑', 'peach'], ['🥭', 'mango'], ['🍍', 'pineapple'], ['🥥', 'coconut'],
  ['🥝', 'kiwi'], ['🍅', 'tomato'], ['🥑', 'avocado'], ['🥦', 'broccoli'],
  ['🥬', 'leafy green'], ['🥒', 'cucumber'], ['🌶️', 'hot pepper'], ['🌽', 'corn'],
  ['🥕', 'carrot'], ['🧄', 'garlic'], ['🧅', 'onion'], ['🥔', 'potato'],
  ['🍠', 'sweet potato'], ['🥐', 'croissant'], ['🍞', 'bread'], ['🥖', 'baguette'],
  ['🧀', 'cheese'], ['🥚', 'egg'], ['🍳', 'fried egg'], ['🥞', 'pancakes'],
  ['🥓', 'bacon'], ['🍗', 'poultry leg'], ['🍖', 'meat on bone'], ['🌭', 'hot dog'],
  ['🍔', 'hamburger'], ['🍟', 'fries'], ['🍕', 'pizza'], ['🥪', 'sandwich'],
  ['🌮', 'taco'], ['🌯', 'burrito'], ['🥗', 'salad'], ['🍝', 'spaghetti'],
  ['🍜', 'ramen'], ['🍲', 'stew'], ['🍣', 'sushi'], ['🍱', 'bento'],
  ['🍤', 'fried shrimp'], ['🍙', 'rice ball'], ['🍚', 'rice'], ['🥟', 'dumpling'],
  ['🍦', 'ice cream'], ['🍨', 'ice cream bowl'], ['🍧', 'shaved ice'], ['🍩', 'doughnut'],
  ['🍪', 'cookie'], ['🎂', 'birthday cake'], ['🍰', 'cake'], ['🧁', 'cupcake'],
  ['🍫', 'chocolate'], ['🍬', 'candy'], ['🍭', 'lollipop'], ['🍯', 'honey'],
  ['🍼', 'baby bottle'], ['☕', 'coffee'], ['🍵', 'tea'], ['🍺', 'beer'],
  ['🍻', 'cheers'], ['🥂', 'clinking glasses'], ['🍷', 'wine'], ['🍹', 'tropical drink'],
  ['🍸', 'cocktail'], ['🧃', 'juice box'], ['🥤', 'cup with straw'], ['🧋', 'bubble tea'],
  ['🚗', 'car'], ['🚕', 'taxi'], ['🚙', 'suv'], ['🚌', 'bus'],
  ['🏎️', 'racing car'], ['🚓', 'police car'], ['🚑', 'ambulance'], ['🚒', 'fire truck'],
  ['🚚', 'truck'], ['🚲', 'bike'], ['🛴', 'scooter'], ['🏍️', 'motorcycle'],
  ['✈️', 'airplane'], ['🛫', 'flight departure'], ['🚀', 'rocket ship'], ['🛸', 'ufo'],
  ['🚁', 'helicopter'], ['⛵', 'boat'], ['🚤', 'speedboat'], ['🛳️', 'ship'],
  ['⚓', 'anchor'], ['🚦', 'traffic light'], ['🚏', 'bus stop'], ['🗺️', 'map'],
  ['🗽', 'statue of liberty'], ['🗼', 'tower'], ['🏰', 'castle'], ['🎡', 'ferris wheel'],
  ['🎢', 'roller coaster'], ['⛲', 'fountain'], ['🏖️', 'beach'], ['🏝️', 'desert island'],
  ['🏜️', 'desert'], ['🌋', 'volcano'], ['⛰️', 'mountain'], ['🏔️', 'snowy mountain'],
  ['🏕️', 'camping'], ['⛺', 'tent'], ['🏠', 'house'], ['🏢', 'office building'],
  ['🏥', 'hospital'], ['🏦', 'bank'], ['🏫', 'school'], ['⛪', 'church'],
  ['🕌', 'mosque'], ['🕍', 'synagogue'], ['⛩️', 'shrine'], ['🌍', 'earth'],
  ['🌙', 'crescent moon'], ['☀️', 'sun2'], ['⭐', 'star2'], ['☁️', 'cloud2'],
  ['⌚', 'watch'], ['📷', 'camera'], ['🎥', 'movie camera'], ['📺', 'tv'],
  ['📻', 'radio'], ['🎮', 'video game'], ['🎲', 'game die'], ['🧩', 'puzzle'],
  ['🎸', 'guitar'], ['🎹', 'piano'], ['🎺', 'trumpet'], ['🎻', 'violin'],
  ['🥁', 'drum'], ['🎤', 'microphone'], ['🎧', 'headphones'], ['⚽', 'soccer'],
  ['🏀', 'basketball'], ['🏈', 'football'], ['⚾', 'baseball'], ['🎾', 'tennis'],
  ['🏐', 'volleyball'], ['🏓', 'ping pong'], ['🏸', 'badminton'], ['🥊', 'boxing glove'],
  ['🎯', 'dart'], ['🎳', 'bowling'], ['🎣', 'fishing'], ['🎿', 'ski'],
  ['🛹', 'skateboard'], ['🏆', 'trophy2'], ['🥇', 'gold medal2'], ['🎨', 'art palette'],
  ['🖌️', 'paintbrush'], ['✏️', 'pencil'], ['📝', 'memo'], ['📚', 'books'],
  ['📖', 'open book'], ['📦', 'package'], ['📮', 'postbox'], ['✉️', 'envelope'],
  ['📧', 'email'], ['💵', 'dollar'], ['💰', 'money bag'], ['💳', 'credit card'],
  ['📊', 'bar chart'], ['📋', 'clipboard'], ['🗂️', 'card index'], ['🗓️', 'spiral calendar'],
  ['✂️', 'scissors'], ['🔨', 'hammer'], ['🧲', 'magnet'], ['🧪', 'test tube'],
  ['🔬', 'microscope'], ['🔭', 'telescope'], ['💉', 'syringe'], ['🩹', 'bandage'],
  ['🩺', 'stethoscope'], ['🚪', 'door'], ['🛏️', 'bed'], ['🚽', 'toilet'],
  ['🚿', 'shower'], ['🛒', 'shopping cart'], ['🎗️', 'ribbon2'], ['🎀', 'ribbon'],
  ['🧸', 'teddy bear'], ['🪁', 'kite'], ['♻️', 'recycle'], ['🔱', 'trident'],
  ['🇺🇳', 'united nations'], ['🇺🇸', 'united states'], ['🇬🇧', 'united kingdom'], ['🇮🇳', 'india'],
  ['🇨🇦', 'canada'], ['🇦🇺', 'australia'], ['🇩🇪', 'germany'], ['🇫🇷', 'france'],
  ['🇮🇹', 'italy'], ['🇪🇸', 'spain'], ['🇯🇵', 'japan'], ['🇰🇷', 'south korea'],
  ['🇨🇳', 'china'], ['🇧🇷', 'brazil'], ['🇷🇺', 'russia'], ['🇲🇽', 'mexico'],
  ['🇳🇱', 'netherlands'], ['🇸🇪', 'sweden'], ['🇨🇭', 'switzerland'], ['🇸🇬', 'singapore'],
  ['🇦🇪', 'uae'], ['🇿🇦', 'south africa'],
];

// [key, display label (matches existing button text), icon svg] for the 4
// feedback types the widget supports. Shared by both type-grid render sites
// (mobile form step + desktop split panel) and filtered per-audience by
// PinmarksWidget.enabledFeedbackTypes() — see Guest Forms / Member Forms in
// Project Settings.
const FEEDBACK_TYPES: { key: FeedbackType; label: string; icon: string }[] = [
  { key: 'bug', label: 'Bug', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C13.04 5.06 12.54 5 12 5c-.54 0-1.04.06-1.53.17L8.41 3 7 4.41l1.62 1.62C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/></svg>' },
  { key: 'suggestion', label: 'Idea', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>' },
  { key: 'question', label: 'Question', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>' },
  { key: 'other', label: 'Other', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' },
];

const ALL_FEEDBACK_TYPES: FeedbackType[] = FEEDBACK_TYPES.map((t) => t.key);

// Extra fields a Guest/Member form can show, set via Project Settings >
// Guest Forms / Member Forms > Fields — the same set for every issue type.
type FieldKey = 'title' | 'priority' | 'assignee' | 'dueDate';

// Fallback list used when guestFormFields/memberFormFields is empty or unset
// (e.g. a project that has never opened the Fields UI). This intentionally is
// NOT an empty array: today, before this feature existed, every widget
// already asks for a Title (unless AI title-generation is on) and never asks
// for anything else — so ['title'] is the true default behavior, not [].
const DEFAULT_VISIBLE_FIELDS: FieldKey[] = ['title'];

type Step = 'annotate' | 'form' | 'submitting' | 'success';

export class PinmarksWidget {
  private config: WidgetConfig;
  private shadowRoot: ShadowRoot;
  private step: Step = 'annotate';
  private screenshotDataUrl = '';
  private annotationCanvas: AnnotationCanvas | null = null;
  private currentTool: AnnotationTool = 'select';
  private feedbackType: FeedbackType = 'bug';
  private isOpen = false;
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
  private guestIdentityOverride = false; // true when user clicked "Change"
  private aiImproveLoading = false;
  private replayEvents: unknown[] = [];
  private stopRecording: (() => void) | null = null;
  // Set once on mount (not re-checked per capture) — gates the "Entire page"
  // toolbar button, which needs the companion browser extension for scroll+stitch.
  private extensionInstalled = false;

  constructor(config: WidgetConfig) {
    this.config = config;

    // If the default type isn't in this reporter's enabled-types list (Guest
    // Forms / Member Forms in Project Settings), fall back to the first type
    // that IS enabled so the picker never opens on a hidden type.
    const enabledTypes = this.enabledFeedbackTypes();
    if (!enabledTypes.includes(this.feedbackType)) {
      this.feedbackType = enabledTypes[0] ?? 'bug';
    }

    // Build shadow DOM host
    const host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: 'closed' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = widgetStyles;
    this.shadowRoot.appendChild(style);

    // Start interceptors if configured
    if (config.collectConsole) ConsoleCapture.start();
    if (config.collectNetwork) NetworkCapture.start();
    if (config.sessionReplay) this.startReplayRecording();

    // Single persistent click handler — never removed, never { once: true }
    this.shadowRoot.addEventListener('click', (e) => this.handleClick(e));

    // Keyboard shortcut: Cmd+I (Mac) / Ctrl+I (Windows) → open widget
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (this.isOpen) this.closeWidget(); else void this.openWidget();
      }
    });

    // Render FAB
    this.renderFAB();

    void detectExtension().then((res) => { this.extensionInstalled = res.installed; });
  }

  // Which issue-type keys the current reporter is allowed to pick — guest
  // list if this session has no identified user, member list once one is
  // set (mirrors the guestReporting/config.user branching used elsewhere in
  // this file to distinguish guest vs. member reporters).
  private enabledFeedbackTypes(): FeedbackType[] {
    const list = this.config.user ? this.config.memberFormTypes : this.config.guestFormTypes;
    return list && list.length > 0 ? list : ALL_FEEDBACK_TYPES;
  }

  // Which extra fields (Title/Priority/Assignee/Due date) are visible on the
  // form — the same set for every issue type, for the current audience (guest
  // vs. member — same guestReporting/config.user split used by
  // enabledFeedbackTypes()). See DEFAULT_VISIBLE_FIELDS for why an empty/unset
  // list falls back to ['title'] rather than [].
  private visibleFields(): FieldKey[] {
    const fields = this.config.user ? this.config.memberFormFields : this.config.guestFormFields;
    return Array.isArray(fields) && fields.length > 0 ? (fields as FieldKey[]) : DEFAULT_VISIBLE_FIELDS;
  }

  // Title has an extra global override on top of the per-type toggle: when
  // AI title-generation is on, the server writes the title from the
  // description, so the input is never shown regardless of the Fields config.
  private shouldShowTitleField(): boolean {
    return !this.config.titleGeneration && this.visibleFields().includes('title');
  }

  private renderTypeGrid(): string {
    return `
      <div class="sf-type-grid">
        ${FEEDBACK_TYPES.filter((t) => this.enabledFeedbackTypes().includes(t.key)).map((t) => `
          <button class="sf-type-btn ${this.feedbackType === t.key ? 'active' : ''}" data-type="${t.key}">
            <span class="sf-type-icon">${t.icon}</span>${t.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  private startReplayRecording() {
    const BUFFER_MS = 30_000;
    this.stopRecording = record({
      emit: (event: unknown) => {
        this.replayEvents.push(event);

        // Protect the initial Meta (type 4) + FullSnapshot (type 2) pair so
        // the Replayer always has a DOM baseline to start from. Only trim
        // old incremental events that come after the initial snapshot.
        // This avoids checkoutEveryNms which forces a full DOM re-snapshot
        // every N ms — extremely CPU-heavy on complex pages.
        let protectedUntil = 0;
        for (let i = 0; i < this.replayEvents.length; i++) {
          const t = (this.replayEvents[i] as { type: number }).type;
          if (t === 4 || t === 2) protectedUntil = i + 1;
          else break;
        }

        const cutoff = Date.now() - BUFFER_MS;
        while (this.replayEvents.length > protectedUntil) {
          const e = this.replayEvents[protectedUntil] as { timestamp: number };
          if (e.timestamp >= cutoff) break;
          this.replayEvents.splice(protectedUntil, 1);
        }
      },
      maskAllInputs: true,
      blockClass: 'sf-no-record',
      sampling: {
        mousemove: 50,
        scroll: 150,
        input: 'last',
      },
    });
  }

  private renderFAB() {
    const pos = this.config.position ?? 'middle-right';
    // middle-right / middle-left → side tab; everything else → corner button
    const isSide = pos === 'middle-right' || pos === 'middle-left';
    const layoutClass = isSide ? 'sf-side' : 'sf-corner';
    const fab = document.createElement('button');
    fab.className = `sf-fab ${layoutClass} sf-pos-${pos}`;
    fab.setAttribute('aria-label', 'Send feedback');
    fab.style.backgroundColor = this.config.color;

    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span class="sf-fab-label">${this.config.buttonText ?? 'Report issue'}</span>
      <span class="sf-fab-dots">···</span>
    `;

    fab.addEventListener('click', () => this.openWidget());
    this.shadowRoot.appendChild(fab);
  }

  public open() {
    if (!this.isOpen) void this.openWidget();
  }

  /** Called by window.Pinmarks.setUser() — pre-identifies the reporter. */
  public setUser(user: { name: string; email: string } | null) {
    this.config.user = user ?? undefined;
  }

  private showLoadingOverlay() {
    // Append directly to document.body (NOT shadow DOM) so it stays visible
    // even when the widget host is hidden during screenshot capture
    const el = document.createElement('div');
    el.id = 'sf-body-loading-overlay';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.75)',
      'pointer-events:all',
    ].join(';');

    el.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;gap:14px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      ">
        <div id="sf-body-spinner" style="
          width:40px;height:40px;
          border:3px solid rgba(255,255,255,0.2);border-top-color:#ffffff;
          border-radius:50%;
          animation:sf-body-spin 0.7s linear infinite;
        "></div>
        <span style="font-size:14px;font-weight:600;color:#ffffff;letter-spacing:0.01em;">Capturing screenshot…</span>
      </div>
      <style>
        @keyframes sf-body-spin { to { transform: rotate(360deg); } }
      </style>
    `;

    document.body.appendChild(el);

    // Put FAB in loading state
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) {
      fab.disabled = true;
      fab.style.opacity = '0.7';
    }
  }

  private hideLoadingOverlay() {
    document.getElementById('sf-body-loading-overlay')?.remove();
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) {
      fab.disabled = false;
      fab.style.opacity = '';
    }
  }

  private async openWidget() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.step = 'annotate';

    this.config.onOpen?.();

    // Show loading immediately so user knows something is happening
    this.showLoadingOverlay();

    try {
      this.screenshotDataUrl = await captureScreenshot(HOST_ID, this.config.apiBaseUrl, this.config.projectApiKey);
      // Compression is deferred to just before upload so the annotation
      // canvas always displays the full-quality PNG.
    } catch (err) {
      console.warn('[Pinmarks] Screenshot capture failed, continuing without it.', err);
      this.screenshotDataUrl = '';
    }

    this.hideLoadingOverlay();
    this.attachBeforeUnload();
    this.renderModal();
  }

  private attachBeforeUnload() {
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private detachBeforeUnload() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  private renderModal() {
    // On desktop re-render, bake annotations into screenshot so they survive
    if (!this.isMobile() && this.annotationCanvas) {
      this.screenshotDataUrl = this.annotationCanvas.getAnnotatedDataUrl();
      this.annotationCanvas.destroy();
      this.annotationCanvas = null;
    }

    this.shadowRoot.querySelector('.sf-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay-annotate')?.remove();
    this.shadowRoot.querySelector('.sf-desktop-overlay')?.remove();

    // Desktop: combined split panel (annotation + form together), except on success
    if (!this.isMobile() && this.step !== 'success') {
      this.renderDesktopSplitPanel();
      return;
    }

    // Mobile annotate step — full-screen canvas
    if (this.step === 'annotate') {
      const overlay = document.createElement('div');
      overlay.className = 'sf-overlay-annotate';
      overlay.innerHTML = this.renderAnnotateStep();
      this.shadowRoot.appendChild(overlay);
      this.initAnnotationCanvas();
      this.bindColorPicker();
      this.bindImageInput();
      return;
    }

    // Centered modal for mobile form / success
    const overlay = document.createElement('div');
    overlay.className = 'sf-overlay';
    const modal = document.createElement('div');
    modal.className = 'sf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    if (this.step === 'success') {
      modal.innerHTML = this.renderSuccess();
    } else {
      modal.innerHTML = this.renderFormStep();
    }

    overlay.appendChild(modal);
    this.shadowRoot.appendChild(overlay);
  }

  private renderDesktopSplitPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'sf-desktop-overlay';

    let guestHtml = '';
    if (this.config.guestReporting && !this.config.user) {
      const saved = this.getGuestIdentity();
      if (saved && !this.guestIdentityOverride) {
        guestHtml = `
        <div class="sf-field">
          <div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f5f3ff;border-radius:8px;font-size:13px;color:#4b5563">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style="flex:1">Submitting as <strong>${saved.name}</strong> &middot; <span style="color:#6b7280">${saved.email}</span></span>
            <button data-action="change-identity" style="background:none;border:none;cursor:pointer;color:#7c3aed;font-size:12px;font-weight:600;padding:0;text-decoration:underline">Change</button>
          </div>
          <input type="hidden" id="sf-name" value="${saved.name}" />
          <input type="hidden" id="sf-email" value="${saved.email}" />
        </div>`;
      } else {
        guestHtml = `
        <div class="sf-name-email-row">
          <div class="sf-field">
            <label class="sf-label" for="sf-name">Your name <span style="color:#dc2626">*</span></label>
            <input id="sf-name" class="sf-input" type="text" placeholder="Jane Smith" value="${this.guestIdentityOverride && saved ? saved.name : ''}" />
          </div>
          <div class="sf-field">
            <label class="sf-label" for="sf-email">Email <span style="color:#dc2626">*</span></label>
            <input id="sf-email" class="sf-input" type="email" placeholder="jane@company.com" value="${this.guestIdentityOverride && saved ? saved.email : ''}" />
          </div>
        </div>`;
      }
    }

    overlay.innerHTML = `
      <div class="sf-desktop-layout">

        <div class="sf-desktop-left">
          <div class="sf-annotate-topbar">
            <div class="sf-toolbar">
              ${this.toolBtn('arrow', '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 'Arrow')}
              ${this.toolBtn('rectangle', '<rect x="3" y="3" width="18" height="18" rx="2"/>', 'Rect')}
              ${this.toolBtn('circle', '<circle cx="12" cy="12" r="9"/>', 'Circle')}
              ${this.toolBtn('freehand', '<path d="M3 17c3-3 5-6 8-6s5 4 8 4"/>', 'Draw')}
              ${this.toolBtn('highlighter', '<path d="M12 2s6 7.5 6 12a6 6 0 01-12 0c0-4.5 6-12 6-12z"/>', 'Highlight')}
              ${this.toolBtn('text', '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', 'Text')}
              ${this.toolBtn('blur', '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>', 'Blur')}
              ${this.toolBtn('select', '<path d="M5 3l14 9-7 1-3 7z"/>', 'Select')}
              <span class="sf-toolbar-sep"></span>
              <input type="color" class="sf-color-picker" value="#FF6B35" data-action="color" title="Color" />
              <button class="sf-tool-btn" data-action="undo" title="Undo" aria-label="Undo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                </svg>
              </button>
              ${this.annotationExtrasHtml()}
              ${this.entirePageBtn()}
            </div>
          </div>
          <div class="sf-annotate-canvas-area">
            <canvas id="sf-annotation-canvas"></canvas>
          </div>
        </div>

        <div class="sf-desktop-right">
          <div class="sf-desktop-right-header">
            <span class="sf-modal-title">Share Feedback</span>
            <button class="sf-close-btn" data-action="close" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="sf-desktop-right-body">
            <div class="sf-field">
              <label class="sf-label">Type</label>
              ${this.renderTypeGrid()}
            </div>
            ${this.typeFieldsHtml()}
            ${this.descriptionFieldHtml()}
            ${guestHtml}
            <div id="sf-error" style="display:none;background:#fef2f2;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;"></div>
          </div>
          <div class="sf-desktop-right-footer">
            <button class="sf-btn-primary" data-action="submit" style="width:100%;padding:13px;font-size:15px;justify-content:center">
              Send Feedback
            </button>
          </div>
        </div>

      </div>
    `;

    this.shadowRoot.appendChild(overlay);
    this.initAnnotationCanvas();
    this.bindColorPicker();
    this.bindImageInput();
  }

  private renderHeader(title: string): string {
    return `
      <div class="sf-modal-header">
        <span class="sf-modal-title">${title}</span>
        <button class="sf-close-btn" data-action="close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="sf-steps">
        <div class="sf-step ${this.step === 'annotate' ? 'active' : 'done'}"></div>
        <div class="sf-step ${this.step === 'form' ? 'active' : this.step === 'success' ? 'done' : ''}"></div>
      </div>
    `;
  }

  private toolBtn(tool: AnnotationTool, icon: string, label: string): string {
    return `<button class="sf-tool-btn ${this.currentTool === tool ? 'active' : ''}" data-tool="${tool}" title="${label}" aria-label="${label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>
      <span class="sf-tool-label">${label}</span>
    </button>`;
  }

  // Shared block of extra toolbar controls (redo/download/copy/image/emoji
  // actions) — inserted identically into both the desktop split-panel and
  // the non-mobile annotate-step toolbars, directly after Undo so the two
  // sit next to each other.
  private annotationExtrasHtml(): string {
    return `
      <button class="sf-tool-btn" data-action="redo" title="Redo" aria-label="Redo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>
        </svg>
      </button>
      <button class="sf-tool-btn" data-action="insert-image" title="Insert image" aria-label="Insert image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
      </button>
      <input type="file" accept="image/*" data-role="image-input" style="display:none" />
      <button class="sf-tool-btn" data-action="emoji-toggle" title="Insert emoji" aria-label="Insert emoji">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </button>
      <button class="sf-tool-btn" data-action="download" title="Download" aria-label="Download">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>
        </svg>
      </button>
      <button class="sf-tool-btn" data-action="copy" title="Copy to clipboard" aria-label="Copy to clipboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>
        </svg>
      </button>
      <button class="sf-tool-btn" data-action="share-link" title="Copy share link" aria-label="Copy share link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      </button>
    `;
  }

  // Only rendered once the companion browser extension is detected — full-page
  // (scroll + stitch) capture isn't possible via getDisplayMedia or html2canvas.
  private entirePageBtn(): string {
    if (!this.extensionInstalled) return '';
    return `<button class="sf-tool-btn" data-action="capture-full-page" title="Capture entire page" aria-label="Capture entire page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/>
      </svg>
      <span class="sf-tool-label">Entire page</span>
    </button>`;
  }

  private titleFieldHtml(): string {
    if (!this.shouldShowTitleField()) return '';
    return `<div class="sf-field">
      <div class="sf-field-label-row">
        <label class="sf-label" for="sf-title">Title <span style="color:#dc2626">*</span></label>
        ${this.aiImproveButtonHtml()}
      </div>
      <input id="sf-title" class="sf-input" type="text" placeholder="Brief summary…" />
    </div>`;
  }

  // Real, wired end-to-end: shown only when "Priority" is toggled visible for
  // this issue type (Guest Forms / Member Forms > Fields), collected in
  // handleSubmit() and sent to /api/feedback, which persists it on the
  // feedback row (see apps/dashboard/app/api/feedback/route.ts baseInsert).
  private priorityFieldHtml(current?: string): string {
    if (!this.visibleFields().includes('priority')) return '';
    const value = current ?? 'medium';
    const opt = (v: string, label: string) => `<option value="${v}" ${value === v ? 'selected' : ''}>${label}</option>`;
    return `<div class="sf-field">
      <label class="sf-label" for="sf-priority">Priority</label>
      <select id="sf-priority" class="sf-select">
        ${opt('low', 'Low')}${opt('medium', 'Medium')}${opt('high', 'High')}${opt('critical', 'Critical')}
      </select>
    </div>`;
  }

  // Real, wired end-to-end: shown only when "Assignee" is toggled visible for
  // this issue type. Options come from config.assignableMembers (org members
  // the widget-config API resolved server-side) — collected in handleSubmit()
  // and sent to /api/feedback, which re-validates membership before persisting
  // to feedback.assigned_to.
  private assigneeFieldHtml(current?: string): string {
    if (!this.visibleFields().includes('assignee')) return '';
    const members = this.config.assignableMembers ?? [];
    if (members.length === 0) return '';
    const opt = (v: string, label: string) => `<option value="${v}" ${current === v ? 'selected' : ''}>${label}</option>`;
    return `<div class="sf-field">
      <label class="sf-label" for="sf-assignee">Assignee</label>
      <select id="sf-assignee" class="sf-select">
        ${opt('', 'Unassigned')}${members.map((m) => opt(m.id, m.name)).join('')}
      </select>
    </div>`;
  }

  // Real, wired end-to-end: shown only when "Due date" is toggled visible for
  // this issue type. Collected in handleSubmit() and sent to /api/feedback,
  // which persists it on feedback.due_date.
  private dueDateFieldHtml(current?: string): string {
    if (!this.visibleFields().includes('dueDate')) return '';
    return `<div class="sf-field">
      <label class="sf-label" for="sf-due-date">Due date</label>
      <input id="sf-due-date" class="sf-input" type="date" value="${current ?? ''}" />
    </div>`;
  }

  // Both render sites (desktop split panel + mobile/standard form) wrap
  // Title+Priority+Assignee+Due date in a `data-role="type-fields"` container
  // so that switching issue type mid-form (handleClick's `typeBtn` branch) can
  // patch just this container via refreshTypeDependentFields() instead of
  // calling the full renderModal(), which would tear down and rebuild the
  // annotation canvas (see initAnnotationCanvas) and destroy any in-progress
  // annotations.
  private typeFieldsHtml(): string {
    return `<div data-role="type-fields">${this.titleFieldHtml()}${this.priorityFieldHtml()}${this.assigneeFieldHtml()}${this.dueDateFieldHtml()}</div>`;
  }

  private refreshTypeDependentFields() {
    const container = this.shadowRoot.querySelector<HTMLElement>('[data-role="type-fields"]');
    if (!container) return;
    const prevTitle = this.shadowRoot.querySelector<HTMLInputElement>('#sf-title')?.value ?? '';
    const prevPriority = this.shadowRoot.querySelector<HTMLSelectElement>('#sf-priority')?.value;
    const prevAssignee = this.shadowRoot.querySelector<HTMLSelectElement>('#sf-assignee')?.value;
    const prevDueDate = this.shadowRoot.querySelector<HTMLInputElement>('#sf-due-date')?.value;
    container.innerHTML = `${this.titleFieldHtml()}${this.priorityFieldHtml(prevPriority)}${this.assigneeFieldHtml(prevAssignee)}${this.dueDateFieldHtml(prevDueDate)}`;
    const titleInput = this.shadowRoot.querySelector<HTMLInputElement>('#sf-title');
    if (titleInput && prevTitle) titleInput.value = prevTitle;
  }

  private descriptionFieldHtml(): string {
    const titleGen = this.config.titleGeneration;
    return `<div class="sf-field">
      <div class="sf-field-label-row">
        <label class="sf-label" for="sf-description">Description ${titleGen ? '' : '<span style="color:#6b5b8a;font-weight:400">(optional)</span>'}</label>
        ${titleGen ? this.aiImproveButtonHtml() : ''}
      </div>
      <textarea id="sf-description" class="sf-textarea" placeholder="What happened? What did you expect?"></textarea>
    </div>`;
  }

  private aiImproveButtonHtml(): string {
    if (!this.config.aiRewrite) return '';
    return `<button type="button" class="sf-ai-improve-btn" data-action="ai-improve" ${this.aiImproveLoading ? 'disabled' : ''}>
      ${this.aiImproveLoading
        ? '<span class="sf-spinner-sm"></span> Improving…'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2z"/><path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z"/></svg> Improve with AI'}
    </button>`;
  }

  private isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  private renderAnnotateStep(): string {
    if (this.isMobile()) return this.renderAnnotateStepMobile();

    return `
      <div class="sf-annotate-panel">
      <div class="sf-annotate-topbar">
        <div class="sf-toolbar">
          ${this.toolBtn('arrow', '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 'Arrow')}
          ${this.toolBtn('rectangle', '<rect x="3" y="3" width="18" height="18" rx="2"/>', 'Rect')}
          ${this.toolBtn('circle', '<circle cx="12" cy="12" r="9"/>', 'Circle')}
          ${this.toolBtn('freehand', '<path d="M3 17c3-3 5-6 8-6s5 4 8 4"/>', 'Draw')}
          ${this.toolBtn('highlighter', '<path d="M12 2s6 7.5 6 12a6 6 0 01-12 0c0-4.5 6-12 6-12z"/>', 'Highlight')}
          ${this.toolBtn('text', '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', 'Text')}
          ${this.toolBtn('blur', '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>', 'Blur')}
          ${this.toolBtn('select', '<path d="M5 3l14 9-7 1-3 7z"/>', 'Select')}
          <span class="sf-toolbar-sep"></span>
          <input type="color" class="sf-color-picker" value="#FF6B35" data-action="color" title="Color" />
          <button class="sf-tool-btn" data-action="undo" title="Undo" aria-label="Undo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
          ${this.annotationExtrasHtml()}
          ${this.entirePageBtn()}
        </div>
        <div class="sf-annotate-actions">
          <button class="sf-btn-secondary" data-action="close" style="padding:8px 14px;font-size:13px">Cancel</button>
          <button class="sf-btn-primary" data-action="next" style="padding:8px 18px;font-size:13px">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="sf-annotate-canvas-area">
        <canvas id="sf-annotation-canvas"></canvas>
      </div>
      </div>
    `;
  }

  private renderAnnotateStepMobile(): string {
    return `
      <div class="sf-annotate-panel sf-annotate-mobile">

        <!-- Top toolbar: same tools as desktop + close -->
        <div class="sf-mobile-topbar">
          <div class="sf-mobile-tools">
            ${this.toolBtn('arrow', '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 'Arrow')}
            ${this.toolBtn('text', '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', 'Text')}
            ${this.toolBtn('rectangle', '<rect x="3" y="3" width="18" height="18" rx="2"/>', 'Rect')}
            ${this.toolBtn('circle', '<circle cx="12" cy="12" r="9"/>', 'Circle')}
            ${this.toolBtn('freehand', '<path d="M3 17c3-3 5-6 8-6s5 4 8 4"/>', 'Draw')}
            <span class="sf-toolbar-sep"></span>
            <button class="sf-tool-btn" data-action="undo" title="Undo" aria-label="Undo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
              </svg>
            </button>
          </div>
          <button class="sf-mobile-close-btn" data-action="close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Canvas fills all space between toolbar and bottom bar -->
        <div class="sf-annotate-canvas-area">
          <canvas id="sf-annotation-canvas"></canvas>
        </div>

        <!-- Large Next button at bottom -->
        <div class="sf-mobile-bottom-bar">
          <button class="sf-mobile-next-full" data-action="next">
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

      </div>
    `;
  }

  private getGuestIdentity(): { name: string; email: string } | null {
    try {
      const raw = localStorage.getItem(SF_GUEST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.name && parsed?.email) return parsed;
    } catch { /* ignore */ }
    return null;
  }

  private saveGuestIdentity(name: string, email: string) {
    try { localStorage.setItem(SF_GUEST_KEY, JSON.stringify({ name, email })); } catch { /* ignore */ }
  }

  private renderFormStep(): string {
    return `
      ${this.renderHeader('Share Feedback')}
      <div class="sf-form">
        <div class="sf-field">
          <label class="sf-label">Type</label>
          ${this.renderTypeGrid()}
        </div>

        ${this.typeFieldsHtml()}
        ${this.descriptionFieldHtml()}

        ${this.config.guestReporting ? (() => {
          // Host app has pre-identified the user — no fields needed
          if (this.config.user) return '';
          const saved = this.getGuestIdentity();
          // Saved identity exists and user hasn't requested to change it
          if (saved && !this.guestIdentityOverride) {
            return `
            <div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f5f3ff;border-radius:8px;font-size:13px;color:#4b5563">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style="flex:1">Submitting as <strong>${saved.name}</strong> &middot; <span style="color:#6b7280">${saved.email}</span></span>
              <button data-action="change-identity" style="background:none;border:none;cursor:pointer;color:#7c3aed;font-size:12px;font-weight:600;padding:0;text-decoration:underline">Change</button>
            </div>
            <input type="hidden" id="sf-name" value="${saved.name}" />
            <input type="hidden" id="sf-email" value="${saved.email}" />`;
          }
          // No saved identity (or user clicked Change) — show input fields
          return `
          <div class="sf-name-email-row">
            <div class="sf-field">
              <label class="sf-label" for="sf-name">Your name <span style="color:#dc2626">*</span></label>
              <input id="sf-name" class="sf-input" type="text" placeholder="Jane Smith" value="${this.guestIdentityOverride && saved ? saved.name : ''}" required />
            </div>
            <div class="sf-field">
              <label class="sf-label" for="sf-email">Email <span style="color:#dc2626">*</span></label>
              <input id="sf-email" class="sf-input" type="email" placeholder="jane@company.com" value="${this.guestIdentityOverride && saved ? saved.email : ''}" required />
            </div>
          </div>`;
        })() : ''}

        <div id="sf-error" style="display:none;background:#fef2f2;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;"></div>
      </div>
      <div class="sf-footer">
        <button class="sf-btn-secondary" data-action="back">← Back</button>
        <button class="sf-btn-primary" data-action="submit">
          Send Feedback
        </button>
      </div>
    `;
  }

  private renderSuccess(): string {
    return `
      <div class="sf-success">
        <div class="sf-success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3>Feedback sent!</h3>
        <p>Thanks for helping us improve. Your feedback has been received.</p>
        <button class="sf-btn-primary" data-action="close" style="margin-top:8px">Done</button>
      </div>
    `;
  }

  private initAnnotationCanvas() {
    const canvasEl = this.shadowRoot.querySelector<HTMLCanvasElement>('#sf-annotation-canvas');
    if (!canvasEl) return;

    const area = canvasEl.parentElement as HTMLElement;

    requestAnimationFrame(() => {
      const areaW = area.clientWidth || window.innerWidth;

      if (this.isMobile() && this.screenshotDataUrl) {
        // Mobile: fit canvas to full width, height follows screenshot aspect ratio
        // so the canvas area becomes naturally scrollable.
        const img = new Image();
        img.onload = () => {
          const scale = areaW / img.naturalWidth;
          canvasEl.width  = areaW;
          canvasEl.height = Math.round(img.naturalHeight * scale);
          this.annotationCanvas = new AnnotationCanvas(canvasEl, this.screenshotDataUrl);
          this.annotationCanvas.setTool(this.currentTool);
        };
        img.src = this.screenshotDataUrl;
      } else {
        const areaH = area.clientHeight || (window.innerHeight - 108);
        canvasEl.width  = areaW;
        canvasEl.height = areaH;
        this.annotationCanvas = new AnnotationCanvas(canvasEl, this.screenshotDataUrl);
        this.annotationCanvas.setTool(this.currentTool);
      }
    });
  }

  // Single persistent handler — handles all steps, never re-bound
  private handleClick(e: Event) {
    const target = e.target as HTMLElement;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
    const tool = target.closest('[data-tool]')?.getAttribute('data-tool') as AnnotationTool | null;
    const typeBtn = target.closest('[data-type]')?.getAttribute('data-type') as FeedbackType | null;
    const emoji = target.closest('[data-emoji]')?.getAttribute('data-emoji');

    // Close the emoji popup on any click outside it (except its own toggle,
    // handled below, and its own emoji buttons, which need it to stay open
    // until the pick is processed).
    const openPopup = this.shadowRoot.querySelector<HTMLElement>('[data-role="emoji-popup"]');
    if (openPopup && action !== 'emoji-toggle' && !emoji && !openPopup.contains(target)) {
      openPopup.remove();
    }

    // Confirm-close dialog actions (always checked first)
    if (action === 'confirm-leave') { this.dismissConfirm(); this.closeWidget(); return; }
    if (action === 'keep-editing')  { this.dismissConfirm(); return; }

    // Universal close — show confirm if there's something to lose
    if (action === 'close') {
      if (this.step === 'success') {
        this.closeWidget();
      } else {
        this.showConfirmClose();
      }
      return;
    }

    // Tool & undo — work whenever canvas is active (annotate step, desktop split)
    if (action === 'undo') { this.annotationCanvas?.undo(); return; }
    if (action === 'redo') { this.annotationCanvas?.redo(); return; }
    if (action === 'capture-full-page') { void this.captureEntirePage(target.closest<HTMLButtonElement>('[data-action="capture-full-page"]')); return; }
    if (action === 'download') { this.downloadScreenshot(); return; }
    if (action === 'copy') { void this.copyScreenshotToClipboard(); return; }
    if (action === 'share-link') { void this.shareLink(target.closest<HTMLButtonElement>('[data-action="share-link"]')); return; }
    if (action === 'insert-image') {
      target.closest<HTMLButtonElement>('[data-action="insert-image"]')?.blur();
      this.shadowRoot.querySelector<HTMLInputElement>('[data-role="image-input"]')?.click();
      return;
    }
    if (action === 'emoji-toggle') {
      this.toggleEmojiPicker(target.closest<HTMLElement>('[data-action="emoji-toggle"]'));
      return;
    }
    if (emoji) {
      this.annotationCanvas?.addEmoji(emoji);
      this.shadowRoot.querySelector('[data-role="emoji-popup"]')?.remove();
      return;
    }
    if (tool) {
      this.currentTool = tool;
      this.annotationCanvas?.setTool(tool);
      this.shadowRoot.querySelectorAll('[data-tool]').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
      });
      return;
    }

    // Mobile-only step navigation
    if (action === 'next' && this.step === 'annotate') { this.goToForm(); return; }
    if (action === 'back' && this.step === 'form') { this.step = 'annotate'; this.renderModal(); return; }

    // Submit & form actions — work from mobile form step AND desktop split panel
    if (action === 'submit') { void this.handleSubmit(); return; }
    if (action === 'ai-improve') { void this.handleAiImprove(target.closest<HTMLButtonElement>('[data-action="ai-improve"]')); return; }
    if (action === 'change-identity') { this.guestIdentityOverride = true; this.renderModal(); return; }
    if (typeBtn) {
      this.feedbackType = typeBtn;
      this.shadowRoot.querySelectorAll('[data-type]').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === typeBtn);
      });
      this.refreshTypeDependentFields();
      return;
    }
  }

  // Re-bind color picker after each annotate render (DOM is rebuilt)
  private bindColorPicker() {
    const colorPicker = this.shadowRoot.querySelector<HTMLInputElement>('[data-action="color"]');
    colorPicker?.addEventListener('input', (e) => {
      this.annotationCanvas?.setColor((e.target as HTMLInputElement).value);
    });
  }

  // Re-bind the hidden file input after each annotate render (DOM is rebuilt) —
  // 'change' doesn't flow through the delegated click handler like data-action buttons do.
  private bindImageInput() {
    const input = this.shadowRoot.querySelector<HTMLInputElement>('[data-role="image-input"]');
    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') this.annotationCanvas?.addImage(reader.result);
      };
      reader.readAsDataURL(file);
      input.value = ''; // allow re-selecting the same file later
    });
  }

  // Appended directly to shadowRoot (like showConfirmClose()) rather than
  // nested inside the toolbar — the desktop split panel's ancestors
  // (.sf-desktop-overlay's backdrop-filter, .sf-desktop-left/.sf-annotate-topbar's
  // overflow clipping) would otherwise clip a popup nested inside the toolbar.
  // position:fixed + real screen coordinates from the button's own
  // getBoundingClientRect() sidesteps all of that.
  private toggleEmojiPicker(anchor: HTMLElement | null) {
    const existing = this.shadowRoot.querySelector('[data-role="emoji-popup"]');
    if (existing) { existing.remove(); return; }
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'sf-emoji-popup';
    popup.setAttribute('data-role', 'emoji-popup');
    popup.style.position = 'fixed';
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;

    const grid = document.createElement('div');
    grid.className = 'sf-emoji-grid';

    const renderGrid = (filter: string) => {
      const q = filter.trim().toLowerCase();
      const list = q ? EMOJI_DATA.filter(([, name]) => name.includes(q)) : EMOJI_DATA;
      grid.innerHTML = list.length
        ? list.map(([em, name]) => `<button type="button" class="sf-emoji-btn" data-emoji="${em}" title="${name}">${em}</button>`).join('')
        : `<div class="sf-emoji-empty">No emoji found</div>`;
    };

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'sf-emoji-search';
    search.placeholder = 'Search for emojis…';
    search.addEventListener('input', () => renderGrid(search.value));
    // Emoji buttons are handled by the delegated shadow-root click handler
    // (data-emoji), so no extra listener is needed here beyond building the grid.

    renderGrid('');
    popup.appendChild(search);
    popup.appendChild(grid);
    this.shadowRoot.appendChild(popup);
    search.focus();
  }

  private downloadScreenshot() {
    if (!this.annotationCanvas) return;
    const a = document.createElement('a');
    a.href = this.annotationCanvas.getAnnotatedDataUrl();
    a.download = 'feedback.png';
    a.click();
  }

  private async copyScreenshotToClipboard() {
    if (!this.annotationCanvas) return;
    try {
      const res = await fetch(this.annotationCanvas.getAnnotatedDataUrl());
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
      console.warn('[Pinmarks] Copy to clipboard failed.', err);
    }
  }

  private async shareLink(btn: HTMLButtonElement | null) {
    if (!this.annotationCanvas) return;
    const originalTitle = btn?.title;
    try {
      const url = await shareSnapshot(
        this.config.apiBaseUrl,
        this.config.projectApiKey,
        this.annotationCanvas.getAnnotatedDataUrl(),
      );
      await navigator.clipboard.writeText(url);
      if (btn) {
        btn.title = 'Copied!';
        setTimeout(() => { if (btn) btn.title = originalTitle ?? 'Copy share link'; }, 1500);
      }
    } catch (err) {
      console.warn('[Pinmarks] Share link failed.', err);
    }
  }

  private async captureEntirePage(btn: HTMLButtonElement | null) {
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    try {
      const dataUrl = await captureFullPageViaExtension();
      this.screenshotDataUrl = dataUrl;
      await this.annotationCanvas?.replaceBackgroundImage(dataUrl);
    } catch (err) {
      console.warn('[Pinmarks] Entire-page capture failed.', err);
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  }

  private goToForm() {
    if (this.annotationCanvas) {
      this.screenshotDataUrl = this.annotationCanvas.getAnnotatedDataUrl();
      this.annotationCanvas.destroy();
      this.annotationCanvas = null;
    }
    this.step = 'form';
    this.renderModal();
  }

  private async handleSubmit() {
    // Desktop split panel: read the current annotated state without tearing
    // the canvas down yet — validation below can still fail and return early,
    // and the screenshot should stay visible while the user fixes the form.
    if (!this.isMobile() && this.annotationCanvas) {
      this.screenshotDataUrl = this.annotationCanvas.getAnnotatedDataUrl();
    }

    const title = this.shadowRoot.querySelector<HTMLInputElement>('#sf-title')?.value.trim();
    const description = this.shadowRoot.querySelector<HTMLTextAreaElement>('#sf-description')?.value.trim();
    const priority = this.shadowRoot.querySelector<HTMLSelectElement>('#sf-priority')?.value;
    const assignedTo = this.shadowRoot.querySelector<HTMLSelectElement>('#sf-assignee')?.value || undefined;
    const dueDate = this.shadowRoot.querySelector<HTMLInputElement>('#sf-due-date')?.value || undefined;
    const errorEl = this.shadowRoot.querySelector<HTMLElement>('#sf-error');
    const submitBtn = this.shadowRoot.querySelector<HTMLButtonElement>('[data-action="submit"]');

    // Use pre-identified user from config, or read from the form fields
    const name  = this.config.user?.name  ?? this.shadowRoot.querySelector<HTMLInputElement>('#sf-name')?.value.trim();
    const email = this.config.user?.email ?? this.shadowRoot.querySelector<HTMLInputElement>('#sf-email')?.value.trim();

    const showError = (msg: string) => {
      if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    };

    if (this.config.titleGeneration) {
      if (!description) { showError('Please describe the issue.'); return; }
    } else if (this.shouldShowTitleField()) {
      if (!title) { showError('Please enter a title.'); return; }
    } else if (!description) {
      // Title field isn't shown for this issue type (hidden via Fields
      // settings) and AI title-generation is off — need at least a
      // description so there's something to submit.
      showError('Please describe the issue.'); return;
    }

    // Name and email are required when guestReporting is on and no user is pre-set
    if (this.config.guestReporting && !this.config.user) {
      if (!name)  { showError('Please enter your name.'); return; }
      if (!email) { showError('Please enter your email address.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }
    }

    if (errorEl) errorEl.style.display = 'none';

    // Leave the canvas alone here — it stays visible while the request is in
    // flight, and renderModal() already tears it down when the step changes
    // to 'success' (or leaves it up if submission fails, so the user can retry).

    // Show loading
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="sf-spinner"></span> Sending…';
    }

    const metadata = collectMetadata();

    // Compress the annotated screenshot just before upload
    let screenshotToUpload = this.screenshotDataUrl;
    if (screenshotToUpload) {
      try {
        const { compressScreenshot } = await import('../capture/compress');
        screenshotToUpload = await compressScreenshot(screenshotToUpload);
      } catch { /* upload original PNG if compression fails */ }
    }

    try {
      await submitFeedback({
        apiBaseUrl: this.config.apiBaseUrl,
        projectApiKey: this.config.projectApiKey,
        screenshot: screenshotToUpload,
        reporterName: name,
        reporterEmail: email,
        title,
        description,
        type: this.feedbackType,
        consoleLogs: ConsoleCapture.getLogs(),
        networkLogs: NetworkCapture.getLogs(),
        sessionEvents: this.config.sessionReplay ? [...this.replayEvents] : undefined,
        priority,
        assignedTo,
        dueDate,
      });

      // Clear logs after successful submit
      ConsoleCapture.clear();
      NetworkCapture.clear();

      // Persist guest identity so they aren't asked again in this browser
      if (this.config.guestReporting && !this.config.user && name && email) {
        this.saveGuestIdentity(name, email);
        this.guestIdentityOverride = false;
      }

      this.config.onSubmit?.({ type: this.feedbackType, title, description });

      this.step = 'success';
      this.renderModal();
      setTimeout(() => { if (this.step === 'success') this.closeWidget(); }, 3000);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err instanceof Error ? err.message : 'Submission failed. Please try again.';
        errorEl.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Feedback';
      }
    }

    void metadata; // used inline in api.ts
  }

  private async handleAiImprove(btn: HTMLButtonElement | null) {
    if (this.aiImproveLoading) return;

    const titleEl = this.shadowRoot.querySelector<HTMLInputElement>('#sf-title');
    const descEl = this.shadowRoot.querySelector<HTMLTextAreaElement>('#sf-description');
    const errorEl = this.shadowRoot.querySelector<HTMLElement>('#sf-error');
    const title = titleEl?.value.trim() ?? '';
    const description = descEl?.value.trim() ?? '';

    if (!title && !description) {
      if (errorEl) { errorEl.textContent = 'Write a title or description first.'; errorEl.style.display = 'block'; }
      return;
    }

    if (errorEl) errorEl.style.display = 'none';

    // Mutate the button directly (like shareLink/captureEntirePage) instead of a
    // full renderModal() — a re-render here would blur the title/description
    // fields and drop the user's cursor position.
    this.aiImproveLoading = true;
    const originalHtml = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="sf-spinner-sm"></span> Improving…';
    }

    try {
      const improved = await improveFeedbackText(this.config.apiBaseUrl, this.config.projectApiKey, title, description);
      if (titleEl) titleEl.value = improved.title;
      if (descEl) descEl.value = improved.description;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err instanceof Error ? err.message : 'Could not improve text. Please try again.';
        errorEl.style.display = 'block';
      }
    } finally {
      this.aiImproveLoading = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml ?? 'Improve with AI';
      }
    }
  }

  private showConfirmClose() {
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();

    const subtitle = (!this.isMobile() || this.step === 'annotate')
      ? 'You will lose your annotations and feedback.'
      : 'You will lose your feedback.';

    const el = document.createElement('div');
    el.className = 'sf-confirm-overlay';
    el.innerHTML = `
      <div class="sf-confirm-modal">
        <button class="sf-confirm-x" data-action="keep-editing" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <p class="sf-confirm-title">Are you sure you want to leave?</p>
        <p class="sf-confirm-subtitle">${subtitle}</p>
        <div class="sf-confirm-actions">
          <button class="sf-btn-secondary" data-action="keep-editing">Keep editing</button>
          <button class="sf-btn-danger" data-action="confirm-leave">Leave</button>
        </div>
      </div>
    `;
    this.shadowRoot.appendChild(el);
  }

  private dismissConfirm() {
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();
  }

  private closeWidget() {
    this.detachBeforeUnload();
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();
    document.getElementById('sf-body-loading-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay-annotate')?.remove();
    this.shadowRoot.querySelector('.sf-desktop-overlay')?.remove();
    this.annotationCanvas?.destroy();
    this.annotationCanvas = null;
    this.isOpen = false;
    this.screenshotDataUrl = '';
    this.guestIdentityOverride = false;
    this.replayEvents = [];
    if (this.stopRecording) { this.stopRecording(); this.stopRecording = null; }
    if (this.config.sessionReplay) this.startReplayRecording();
    // Reset FAB state
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) { fab.disabled = false; fab.style.opacity = ''; }
    this.config.onClose?.();
  }
}
