/* ========================================
   CodeStreak — App Logic
   Local storage powered daily tracker
   ======================================== */

// ========== Constants ==========
const DAILY_GOAL = 5;
const STORAGE_KEY = 'codestreak_data';

// Motivational quotes
const QUOTES = [
    "Every expert was once a beginner. Keep coding! 💻",
    "The only way to learn is to code. Solve one more! 🚀",
    "Small daily improvements lead to stunning results. 🌟",
    "Code is like humor. When you have to explain it, it's bad. 😄",
    "Don't count the days, make the days count! ⚡",
    "Your future self will thank you for coding today. 🔮",
    "It's not about being the best, it's about being better than yesterday. 📈",
    "One problem at a time, one day at a time. You got this! 💪",
    "Great developers aren't born, they're compiled. 🛠️",
    "Stay hungry, stay foolish, stay coding! 🧠",
    "The best time to solve a problem was yesterday. The next best time is now. ⏰",
    "Debug your limits. Compile your dreams. 🌈",
    "Consistency beats talent when talent doesn't show up. 🏆",
    "Write code like the world depends on it. Because it does. 🌍",
    "You're not just solving problems — you're building your future. 🏗️",
];

// ========== State ==========
let appData = loadData();
let currentCalendarDate = new Date();

// ========== Data Management ==========
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
    return { days: {} };
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
}

function getTodayCount() {
    const key = getTodayKey();
    return appData.days[key] || 0;
}

// ========== Core Actions ==========
function addProblem() {
    const key = getTodayKey();
    const current = appData.days[key] || 0;
    appData.days[key] = current + 1;
    saveData();

    // Animate the count
    const countEl = document.getElementById('progressCount');
    countEl.classList.add('count-bump');
    setTimeout(() => countEl.classList.remove('count-bump'), 300);

    // Check if goal just reached
    if (appData.days[key] === DAILY_GOAL) {
        setTimeout(() => showCelebration(), 400);
    }

    updateUI();
}

function undoProblem() {
    const key = getTodayKey();
    const current = appData.days[key] || 0;
    if (current > 0) {
        appData.days[key] = current - 1;
        if (appData.days[key] === 0) {
            delete appData.days[key];
        }
        saveData();
        updateUI();
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        appData = { days: {} };
        saveData();
        updateUI();
    }
}

// ========== Celebration ==========
function showCelebration() {
    const overlay = document.getElementById('celebrationOverlay');
    overlay.classList.add('active');
    launchConfetti();
}

function closeCelebration() {
    const overlay = document.getElementById('celebrationOverlay');
    overlay.classList.remove('active');
}

function launchConfetti() {
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#34d399', '#f59e0b', '#ef4444', '#ec4899'];
    const shapes = ['●', '■', '▲', '◆', '★'];

    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.fontSize = (Math.random() * 16 + 8) + 'px';
        confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        confetti.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4000);
    }
}

// ========== Stats Calculations ==========
function calculateStats() {
    const days = Object.entries(appData.days);
    const totalSolved = days.reduce((sum, [, count]) => sum + count, 0);
    const goalsHit = days.filter(([, count]) => count >= DAILY_GOAL).length;
    const avgDaily = days.length > 0 ? (totalSolved / days.length).toFixed(1) : 0;

    // Calculate current streak
    let streak = 0;
    const today = new Date();
    const todayKey = getTodayKey();

    // Check if today has any solves — if so, start counting from today; otherwise from yesterday
    let checkDate = new Date(today);
    if (!appData.days[todayKey] || appData.days[todayKey] === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (appData.days[key] && appData.days[key] >= DAILY_GOAL) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    // Calculate best streak
    let bestStreak = 0;
    if (days.length > 0) {
        const sortedDays = days
            .filter(([, count]) => count >= DAILY_GOAL)
            .map(([date]) => new Date(date))
            .sort((a, b) => a - b);

        let tempStreak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
            const diff = (sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24);
            if (Math.round(diff) === 1) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak);
        if (sortedDays.length === 0) bestStreak = 0;
    }

    bestStreak = Math.max(bestStreak, streak);

    return { totalSolved, goalsHit, avgDaily, streak, bestStreak };
}

// ========== UI Updates ==========
function updateUI() {
    updateDate();
    updateProgress();
    updateStats();
    updateCalendar();
    updateLog();
    updateMotivation();
}

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', options);
}

function updateProgress() {
    const count = getTodayCount();
    const progressFill = document.getElementById('progressFill');
    const progressCount = document.getElementById('progressCount');
    const btnSolve = document.getElementById('btnSolve');
    const circumference = 2 * Math.PI * 85; // r=85
    const progress = Math.min(count / DAILY_GOAL, 1);
    const offset = circumference * (1 - progress);

    progressFill.style.strokeDashoffset = offset;
    progressCount.textContent = count;

    // Update completed state
    const isCompleted = count >= DAILY_GOAL;
    progressFill.classList.toggle('completed', isCompleted);
    progressCount.classList.toggle('completed', isCompleted);
    btnSolve.classList.toggle('completed-btn', isCompleted);

    if (isCompleted) {
        btnSolve.querySelector('.btn-text').textContent = 'Bonus Problem! 🌟';
    } else {
        btnSolve.querySelector('.btn-text').textContent = 'Problem Solved!';
    }

    // Update dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < count);
        dot.classList.toggle('all-done', isCompleted);
    });
}

function updateStats() {
    const stats = calculateStats();
    animateCounter('totalSolved', stats.totalSolved);
    animateCounter('bestStreak', stats.bestStreak);
    document.getElementById('avgDaily').textContent = stats.avgDaily;
    animateCounter('goalsHit', stats.goalsHit);
    document.getElementById('streakCount').textContent = stats.streak;

    // Animate streak badge
    const badge = document.getElementById('streakBadge');
    if (stats.streak > 0) {
        badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        badge.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.15)';
    } else {
        badge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        badge.style.boxShadow = 'none';
    }
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 400;
    const steps = 20;
    const increment = (target - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        if (step >= steps) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.round(current + increment * step);
        }
    }, duration / steps);
}

function updateMotivation() {
    const count = getTodayCount();
    const el = document.getElementById('motivationText');

    if (count === 0) {
        el.textContent = '"' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '"';
    } else if (count < DAILY_GOAL) {
        const remaining = DAILY_GOAL - count;
        el.textContent = `🔥 ${remaining} more to go! You're ${Math.round((count / DAILY_GOAL) * 100)}% there. Keep pushing!`;
    } else {
        el.textContent = `🏆 Goal crushed! You've solved ${count} problems today. Absolute legend!`;
    }
}

// ========== Calendar ==========
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    updateCalendar();
}

function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('monthLabel');

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const today = new Date();

    monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    grid.innerHTML = '';

    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(name => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = name;
        grid.appendChild(header);
    });

    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-cell empty';
        grid.appendChild(empty);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = appData.days[key] || 0;
        const level = getLevel(count);

        cell.className = `calendar-cell level-${level}`;
        cell.textContent = day;

        // Today marker
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            cell.classList.add('today');
        }

        // Tooltip for days with data
        if (count > 0) {
            cell.classList.add('has-data');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = `${count} problem${count !== 1 ? 's' : ''} solved`;
            cell.appendChild(tooltip);
        }

        grid.appendChild(cell);
    }
}

function getLevel(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 3) return 3;
    if (count <= 4) return 4;
    return 5;
}

// ========== Activity Log ==========
function updateLog() {
    const logList = document.getElementById('logList');
    const days = Object.entries(appData.days)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 14); // Show last 14 days

    if (days.length === 0) {
        logList.innerHTML = '<div class="log-empty">No activity yet. Solve your first problem! 🚀</div>';
        return;
    }

    logList.innerHTML = days.map(([dateStr, count]) => {
        const date = new Date(dateStr + 'T00:00:00');
        const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const isGoalMet = count >= DAILY_GOAL;
        const todayKey = getTodayKey();
        const isToday = dateStr === todayKey;

        return `
            <div class="log-item">
                <div class="log-item-left">
                    <span class="log-date">${isToday ? '📌 Today' : formatted}</span>
                    <span class="log-count ${isGoalMet ? 'goal-met' : 'goal-not-met'}">${count} solved</span>
                </div>
                <span class="log-badge ${isGoalMet ? 'complete' : 'partial'}">${isGoalMet ? '✅ Goal Met' : `${count}/${DAILY_GOAL}`}</span>
            </div>
        `;
    }).join('');
}

// ========== Background Particles ==========
function createParticles() {
    const container = document.getElementById('bgParticles');
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// ========== Algorithm Library ==========
const algorithmData = [
    {
        category: "Searching Algorithms",
        algorithms: ["Linear Search", "Binary Search", "Jump Search", "Interpolation Search", "Exponential Search", "Ternary Search"]
    },
    {
        category: "Sorting Algorithms",
        algorithms: ["Bubble Sort", "Selection Sort", "Insertion Sort", "Merge Sort", "Quick Sort", "Heap Sort", "Counting Sort", "Radix Sort", "Bucket Sort", "Shell Sort", "Tim Sort"]
    },
    {
        category: "Two Pointer Algorithms",
        algorithms: ["Two Sum (Sorted Array)", "Container With Most Water", "Remove Duplicates", "Move Zeroes", "3Sum", "4Sum", "Trapping Rain Water (Two Pointer)"]
    },
    {
        category: "Sliding Window Algorithms",
        algorithms: ["Maximum Sum Subarray of Size K", "First Negative Integer in Every Window", "Longest Substring Without Repeating Characters", "Minimum Window Substring", "Maximum Consecutive Ones"]
    },
    {
        category: "Prefix/Suffix Based Algorithms",
        algorithms: ["Prefix Sum", "Suffix Sum", "Difference Array", "Equilibrium Index", "Product of Array Except Self"]
    },
    {
        category: "Hashing Based Algorithms",
        algorithms: ["Two Sum", "Longest Consecutive Sequence", "Subarray Sum Equals K", "Majority Element", "Top K Frequent Elements"]
    },
    {
        category: "Kadane Family",
        algorithms: ["Kadane's Algorithm", "Maximum Circular Subarray Sum", "Maximum Product Subarray"]
    },
    {
        category: "Binary Search on Answer",
        algorithms: ["Allocate Books", "Aggressive Cows", "Koko Eating Bananas", "Capacity to Ship Packages", "Split Array Largest Sum", "Painter's Partition"]
    },
    {
        category: "Monotonic Stack Algorithms",
        algorithms: ["Next Greater Element", "Previous Greater Element", "Next Smaller Element", "Previous Smaller Element", "Largest Rectangle in Histogram", "Stock Span Problem", "Daily Temperatures"]
    },
    {
        category: "Greedy Algorithms on Arrays",
        algorithms: ["Jump Game", "Jump Game II", "Gas Station", "Candy Distribution", "Activity Selection"]
    },
    {
        category: "Divide and Conquer",
        algorithms: ["Merge Sort", "Quick Sort", "Count Inversions", "Maximum Subarray (Divide & Conquer)"]
    },
    {
        category: "Dynamic Programming on Arrays",
        algorithms: ["House Robber", "House Robber II", "Maximum Sum Increasing Subsequence", "Longest Increasing Subsequence (LIS)", "Maximum Product Subarray", "Partition Equal Subset Sum"]
    },
    {
        category: "Heap/Priority Queue Algorithms",
        algorithms: ["Kth Largest Element", "Top K Frequent Elements", "Merge K Sorted Arrays", "Sliding Window Maximum"]
    },
    {
        category: "Bit Manipulation Algorithms",
        algorithms: ["Single Number", "Missing Number", "XOR of All Numbers", "Find Two Non-Repeating Elements"]
    },
    {
        category: "Advanced Array Algorithms",
        algorithms: ["Moore's Voting Algorithm", "Boyer-Moore Majority Vote", "Dutch National Flag Algorithm", "Floyd's Cycle Detection (Find Duplicate Number)", "Meet in the Middle", "Coordinate Compression", "Sparse Table", "Segment Tree", "Fenwick Tree (BIT)", "Square Root Decomposition"]
    }
];

function renderAlgorithmLibrary() {
    const grid = document.getElementById('algoGrid');
    if (!grid) return;
    
    grid.innerHTML = algorithmData.map((categoryObj, index) => {
        return `
            <div class="folder-card" id="folder-${index}" onclick="toggleFolder(${index})">
                <div class="folder-header">
                    <span class="folder-icon">📁</span>
                    <span class="folder-title">${categoryObj.category}</span>
                </div>
                <div class="folder-content" onclick="event.stopPropagation()">
                    ${categoryObj.algorithms.map(algo => `
                        <div class="algo-item">
                            <span class="algo-name" title="${algo}">${algo}</span>
                            <button class="btn-save-folder" onclick="downloadAlgorithmFolder('${algo.replace(/'/g, "\\'")}', '${categoryObj.category.replace(/'/g, "\\'")}')">
                                ⬇️ Save
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleFolder(index) {
    const folder = document.getElementById(`folder-${index}`);
    
    // Close other folders
    document.querySelectorAll('.folder-card.open').forEach(f => {
        if (f.id !== `folder-${index}`) {
            f.classList.remove('open');
            f.querySelector('.folder-icon').textContent = '📁';
        }
    });

    // Toggle target folder
    const isOpen = folder.classList.contains('open');
    if (isOpen) {
        folder.classList.remove('open');
        folder.querySelector('.folder-icon').textContent = '📁';
    } else {
        folder.classList.add('open');
        folder.querySelector('.folder-icon').textContent = '📂';
    }
}

function downloadAlgorithmFolder(algoName, categoryName) {
    if (typeof JSZip === 'undefined') {
        alert("JSZip library is not loaded. Please ensure you are connected to the internet.");
        return;
    }

    const zip = new JSZip();
    const folderName = algoName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Create folder
    const folder = zip.folder(folderName);

    // Boilerplate contents
    const readmeContent = `# ${algoName}\n\nCategory: ${categoryName}\n\n## Problem Description\n\n[Add problem description here]\n\n## Notes\n\n- Time Complexity: \n- Space Complexity: \n`;
    
    const pyContent = `def solution():\n    # TODO: Implement ${algoName}\n    pass\n\nif __name__ == "__main__":\n    solution()\n`;
    const jsContent = `/**\n * Implementation of ${algoName}\n */\nfunction solution() {\n    // TODO: Implement ${algoName}\n}\n\nsolution();\n`;
    const cppContent = `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\n// TODO: Implement ${algoName}\nvoid solution() {\n    \n}\n\nint main() {\n    solution();\n    return 0;\n}\n`;

    folder.file("README.md", readmeContent);
    folder.file("solution.py", pyContent);
    folder.file("solution.js", jsContent);
    folder.file("solution.cpp", cppContent);

    // Generate zip and download
    zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ========== Local Folder Saving (File System Access API) ==========
let workspaceHandle = null;

function populateCategoryDropdown() {
    const select = document.getElementById('algoCategory');
    if (!select) return;

    algorithmData.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category;
        option.textContent = cat.category;
        select.appendChild(option);
    });
}

async function selectWorkspace() {
    try {
        if (!window.showDirectoryPicker) {
            alert("Your browser doesn't support the File System Access API. Please use a Chromium-based browser like Chrome or Edge.");
            return;
        }
        
        workspaceHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        
        document.getElementById('workspaceStatus').textContent = `Connected: ${workspaceHandle.name}`;
        document.getElementById('workspaceStatus').style.color = 'var(--accent-green)';
        document.getElementById('btnSaveLocal').disabled = false;
        
        // Save handle to IndexedDB for persistence across reloads could be added here in a real app
    } catch (err) {
        console.error("Workspace selection failed:", err);
    }
}

function updateTargetFolder() {
    const select = document.getElementById('algoCategory');
    const input = document.getElementById('targetFolder');
    if (select.value) {
        // Auto-fill the target folder name with the category name (e.g., 'Two Pointer Algorithms')
        input.value = select.value.replace(/\s+/g, '_'); // Replace spaces with underscores for folder names
    }
}

async function handleSaveProblem(event) {
    event.preventDefault();

    if (!workspaceHandle) {
        alert("Please select a workspace folder first.");
        return;
    }

    const problemName = document.getElementById('problemName').value.trim();
    const targetFolderName = document.getElementById('targetFolder').value.trim();
    const code = document.getElementById('problemCode').value;
    const extension = document.getElementById('fileExtension').value;

    if (!problemName || !targetFolderName) {
        alert("Please provide both a problem name and a target folder.");
        return;
    }

    try {
        // 1. Get or create the Target Algorithm Folder (e.g. "Two_Pointer_Algorithms")
        const targetFolderHandle = await workspaceHandle.getDirectoryHandle(targetFolderName, { create: true });
        
        // 2. Get or create the specific Problem Folder (e.g. "Two_Sum")
        const problemFolderName = problemName.replace(/[^a-zA-Z0-9]/g, '_');
        const problemFolderHandle = await targetFolderHandle.getDirectoryHandle(problemFolderName, { create: true });

        // 3. Write the Code File
        const codeFileName = `solution${extension}`;
        const codeFileHandle = await problemFolderHandle.getFileHandle(codeFileName, { create: true });
        const codeWritable = await codeFileHandle.createWritable();
        await codeWritable.write(code);
        await codeWritable.close();

        // 4. Write a README
        const readmeHandle = await problemFolderHandle.getFileHandle("README.md", { create: true });
        const readmeWritable = await readmeHandle.createWritable();
        await readmeWritable.write(`# ${problemName}\n\nAlgorithm Category: ${targetFolderName}\n\n## Solution\nRefer to \`${codeFileName}\` for the implementation.\n`);
        await readmeWritable.close();

        alert(`Success! "${problemName}" has been saved locally to \\${workspaceHandle.name}\\${targetFolderName}\\${problemFolderName}`);
        
        // Add to CodeStreak count
        addProblem();
        
        // Reset form
        document.getElementById('saveForm').reset();
        
    } catch (err) {
        console.error("Failed to save to local file system:", err);
        alert("Failed to save to disk. Make sure you granted permissions.");
    }
}

// ========== Initialize ==========
function init() {
    createParticles();
    updateUI();
    renderAlgorithmLibrary();
    populateCategoryDropdown();
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
