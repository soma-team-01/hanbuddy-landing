// 신청 폼의 날짜 선택 캘린더.
//
// 회차마다 고를 수 있는 날짜가 다르다. 야구·축구는 리그 일정에 묶여 경기가 있는
// 날만 열리고(고척은 한 달에 열흘 남짓, 잠실은 월요일만 빼고 거의 매일), 음식·한강은
// 리드타임 이후 전부 열린다. 목록을 나열하면 회차마다 길이가 몇 배씩 달라지므로
// 달력 한 판으로 통일한다. 열리지 않는 날은 아예 눌리지 않게 두어, 규칙을 문장으로
// 설명하지 않아도 지켜지고 최소 인원이나 마감 시각을 노출하지 않아도 된다.
(function initDatePicker(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyDatePicker = api;
})(typeof window === 'undefined' ? null : window, () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  // 날짜 계산은 UTC 자정으로 고정한다. 로컬 타임존이 끼면 서머타임이나 오프셋
  // 때문에 날짜가 하루씩 밀린다(event-slots.js와 같은 이유, 같은 방식).
  const ymdToUtc = (ymd) => Date.UTC(
    Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)),
  );
  const utcToYmd = (ms) => new Date(ms).toISOString().slice(0, 10);
  const shiftDays = (ymd, days) => utcToYmd(ymdToUtc(ymd) + days * DAY_MS);
  const monthOf = (ymd) => ymd.slice(0, 7);
  const firstOfMonth = (month) => `${month}-01`;
  const shiftMonth = (month, step) => {
    const year = Number(month.slice(0, 4));
    const index = Number(month.slice(5, 7)) - 1 + step;
    return `${year + Math.floor(index / 12)}-${String(((index % 12) + 12) % 12 + 1).padStart(2, '0')}`;
  };

  // input은 마크업이 선언한 hidden 필드를 받는다. 값을 나르는 필드까지 스크립트가
  // 만들면 폼이 무엇을 보내는지 HTML만 봐서는 알 수 없게 된다.
  const create = ({ mount, input, labels }) => {
    let slots = [];
    let byDay = new Map();
    let months = [];
    let viewMonth = null;
    let selected = '';
    let language = 'en';
    let onChange = () => {};

    const wrap = document.createElement('div');
    wrap.className = 'rounded-xl border border-line-strong bg-canvas-soft p-3 sm:p-4';

    const head = document.createElement('div');
    head.className = 'flex items-center justify-between gap-2';
    const prev = document.createElement('button');
    const next = document.createElement('button');
    for (const button of [prev, next]) {
      button.type = 'button';
      button.className = 'focusable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold text-primary-strong transition hover:bg-primary-soft disabled:opacity-30';
    }
    prev.textContent = '←';
    next.textContent = '→';
    const title = document.createElement('p');
    title.className = 'font-display text-base font-extrabold tracking-tight text-ink';
    head.append(prev, title, next);

    const weekRow = document.createElement('div');
    weekRow.className = 'mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted';
    weekRow.setAttribute('aria-hidden', 'true');

    const grid = document.createElement('div');
    grid.className = 'mt-1 grid grid-cols-7 gap-1';
    grid.setAttribute('role', 'group');

    // 고른 날짜와 집합 시각을 글자로도 남긴다. 달력 칸의 배경색만으로는
    // 무엇을 골랐는지 화면 리더에 전달되지 않는다.
    const status = document.createElement('p');
    status.className = 'mt-3 text-sm font-semibold text-ink';
    status.setAttribute('role', 'status');

    const empty = document.createElement('p');
    empty.className = 'mt-3 text-sm leading-6 text-muted';
    empty.hidden = true;

    wrap.append(head, weekRow, grid, status, empty);
    mount.append(wrap);

    const enabledIsos = () => slots.map((slot) => slot.iso);

    // 좌우 이동은 "열려 있는 다음 날짜"로 간다. 고척처럼 띄엄띄엄 열리는 회차에서
    // 하루씩 밀면 비활성 칸을 여러 번 지나야 해서 키보드로는 사실상 못 쓴다.
    const step = (delta, isTrusted = false) => {
      const isos = enabledIsos();
      const at = isos.indexOf(selected);
      // 아직 고른 날이 없으면 진행 방향의 끝에서 시작한다. at을 0으로 보면
      // 오른쪽 화살표가 첫 날짜를 건너뛰고 두 번째 날부터 고르게 된다.
      const target = at < 0
        ? (delta > 0 ? isos[0] : isos.at(-1))
        : isos[at + delta];
      if (target) select(target, { focus: true, isTrusted });
    };

    // 위아래는 한 주씩. 그 자리가 닫혀 있으면 같은 방향에서 가장 가까운 날로 붙는다.
    const stepWeek = (delta, isTrusted = false) => {
      if (!selected) return step(delta > 0 ? 1 : -1, isTrusted);
      const wanted = shiftDays(selected.slice(0, 10), delta * 7);
      if (byDay.has(wanted)) return select(byDay.get(wanted).iso, { focus: true, isTrusted });
      const isos = enabledIsos();
      const pool = delta > 0
        ? isos.filter((iso) => iso.slice(0, 10) >= wanted)
        : isos.filter((iso) => iso.slice(0, 10) <= wanted).reverse();
      if (pool.length) select(pool[0], { focus: true, isTrusted });
    };

    const focusActive = () => {
      const target = grid.querySelector('[tabindex="0"]');
      if (target) {
        target.focus();
        return;
      }
      // 사이 달에 열린 날이 하나도 없을 수 있다(예: 9월은 비고 10월만 열림).
      // 그 달에는 포커스를 줄 칸이 없는데, 포커스가 body로 떨어지면 keydown이
      // 닿지 않아 PageUp으로 되돌아올 수도 없다. 그리드 자체가 받는다.
      grid.tabIndex = -1;
      grid.focus();
    };

    const render = () => {
      // 화살표 글리프는 화면 리더가 "왼쪽 화살표"로만 읽는다. 무엇이 움직이는지는
      // 라벨로 말해줘야 한다. 언어 전환마다 다시 붙인다.
      grid.setAttribute('aria-label', labels[language].gridLabel);
      prev.setAttribute('aria-label', labels[language].prevMonth);
      next.setAttribute('aria-label', labels[language].nextMonth);

      grid.replaceChildren();
      weekRow.replaceChildren();
      for (const name of labels[language].weekdays) {
        const cell = document.createElement('span');
        cell.textContent = name;
        weekRow.appendChild(cell);
      }

      if (!slots.length || !viewMonth) {
        title.textContent = '';
        empty.hidden = false;
        empty.textContent = labels[language].noDates;
        status.textContent = '';
        prev.disabled = true;
        next.disabled = true;
        return;
      }
      empty.hidden = true;

      const monthIndex = Number(viewMonth.slice(5, 7)) - 1;
      title.textContent = labels[language].monthTitle(labels[language].months[monthIndex], viewMonth.slice(0, 4));
      prev.disabled = months.indexOf(viewMonth) <= 0;
      next.disabled = months.indexOf(viewMonth) >= months.length - 1;

      // 그 달 1일이 무슨 요일인지에 맞춰 앞을 빈칸으로 채운다.
      const lead = new Date(ymdToUtc(firstOfMonth(viewMonth))).getUTCDay();
      for (let i = 0; i < lead; i += 1) {
        const blank = document.createElement('span');
        blank.className = 'h-10';
        grid.appendChild(blank);
      }

      const daysInMonth = new Date(Date.UTC(
        Number(viewMonth.slice(0, 4)), Number(viewMonth.slice(5, 7)), 0,
      )).getUTCDate();

      // 포커스는 한 번에 한 칸만 받는다. 열린 날이 40개 넘는 회차에서
      // 전부 탭 순서에 들어가면 키보드로 폼을 통과할 수가 없다.
      const roving = byDay.has(selected.slice(0, 10)) && monthOf(selected) === viewMonth
        ? selected.slice(0, 10)
        : slots.map((slot) => slot.iso.slice(0, 10)).find((ymd) => monthOf(ymd) === viewMonth);

      for (let day = 1; day <= daysInMonth; day += 1) {
        const ymd = `${viewMonth}-${String(day).padStart(2, '0')}`;
        const slot = byDay.get(ymd);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.textContent = String(day);
        cell.dataset.day = ymd;
        if (!slot) {
          cell.disabled = true;
          cell.className = 'h-10 rounded-lg text-sm text-muted/40';
          cell.setAttribute('aria-label', labels[language].unavailable(day));
        } else {
          const isSelected = slot.iso === selected;
          cell.className = isSelected
            ? 'focusable h-10 rounded-lg bg-primary text-sm font-extrabold text-on-primary'
            : 'focusable h-10 rounded-lg bg-canvas text-sm font-bold text-ink transition hover:bg-primary-soft';
          cell.setAttribute('aria-pressed', String(isSelected));
          cell.setAttribute('aria-label', slot.label[language]);
          cell.tabIndex = ymd === roving ? 0 : -1;
        }
        grid.appendChild(cell);
      }

      const chosen = slots.find((slot) => slot.iso === selected);
      status.textContent = chosen
        ? labels[language].selected(chosen.label[language])
        : labels[language].pickPrompt;
    };

    function select(iso, { focus = false, silent = false, isTrusted = false } = {}) {
      selected = iso || '';
      input.value = selected;
      if (selected) viewMonth = monthOf(selected);
      render();
      if (focus) focusActive();
      if (!silent) onChange(selected, isTrusted === true);
    }

    grid.addEventListener('click', (event) => {
      const cell = event.target.closest('button[data-day]');
      if (!cell || cell.disabled) return;
      select(byDay.get(cell.dataset.day).iso, { focus: true, isTrusted: event.isTrusted });
    });

    grid.addEventListener('keydown', (event) => {
      const moves = {
        ArrowRight: () => step(1, event.isTrusted),
        ArrowLeft: () => step(-1, event.isTrusted),
        ArrowDown: () => stepWeek(1, event.isTrusted),
        ArrowUp: () => stepWeek(-1, event.isTrusted),
        Home: () => select(enabledIsos()[0], { focus: true, isTrusted: event.isTrusted }),
        End: () => select(enabledIsos().at(-1), { focus: true, isTrusted: event.isTrusted }),
        PageDown: () => showMonth(1),
        PageUp: () => showMonth(-1),
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      move();
    });

    const showMonth = (delta) => {
      const at = months.indexOf(viewMonth) + delta;
      if (at < 0 || at >= months.length) return;
      viewMonth = months[at];
      render();
      focusActive();
    };

    prev.addEventListener('click', () => showMonth(-1));
    next.addEventListener('click', () => showMonth(1));

    return {
      element: wrap,
      // 회차나 언어가 바뀔 때마다 부른다. 고르던 날짜가 새 목록에도 있으면 유지한다.
      setDates(nextSlots, nextLanguage) {
        slots = [...nextSlots].sort((a, b) => (a.iso < b.iso ? -1 : 1));
        byDay = new Map(slots.map((slot) => [slot.iso.slice(0, 10), slot]));
        months = [...new Set(slots.map((slot) => monthOf(slot.iso)))].sort();
        // 사이 달에 열린 날이 하나도 없어도 넘어갈 수 있어야 한다(예: 9월은 비고 10월만 열림).
        if (months.length > 1) {
          const filled = [];
          for (let month = months[0]; month <= months.at(-1); month = shiftMonth(month, 1)) filled.push(month);
          months = filled;
        }
        language = nextLanguage;
        const keep = slots.some((slot) => slot.iso === selected) ? selected : '';
        // 언어만 바꿨을 때 보고 있던 달까지 8월로 되돌아가면, 10월을 보던 사람은
        // 자기가 어디에 있었는지 잃는다. 그 달이 아직 유효하면 그대로 둔다.
        const stay = months.includes(viewMonth) ? viewMonth : null;
        viewMonth = monthOf(keep) || stay || months[0] || null;
        select(keep, { silent: true });
      },
      focus: focusActive,
      onChange(handler) { onChange = handler; },
    };
  };

  return { create };
});
