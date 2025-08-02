document.addEventListener('DOMContentLoaded', async () => {
    const quizContainer = document.getElementById('quiz-container');
    const summaryCard = document.getElementById('summary-card');
    const questionElement = document.getElementById('question');
    const optionsContainer = document.getElementById('options-container');
    const nextButton = document.getElementById('next-btn');
    const resultTitleElement = document.getElementById('result-title');
    const resultDescriptionElement = document.getElementById('result-description');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const scenarioContextElement = document.getElementById('scenario-context');
    const scenarioTextElement = document.getElementById('scenario-text');
    const restartButton = document.getElementById('restart-btn');
    const shareButton = document.getElementById('share-btn');
    const clipboardMessage = document.getElementById('clipboard-message');

    const DIMENSIONS = ["EQ", "Tactics", "Tradition", "Pragmatism", "Assertiveness", "Rebellion"];
    const DIM_NAMES = ["高情商", "迂迴戰術", "傳統孝道", "務實主義", "直球對決", "反骨指數"];
    const MAX_SCORES = { EQ: 6, Tactics: 6, Tradition: 5, Pragmatism: 6, Assertiveness: 6, Rebellion: 5 };
    const DIM_DESC = {
      EQ: "你擅長體察他人情緒，用溫和圓融的方式化解衝突，是家庭中的潤滑劑。",
      Tactics: "你精通聲東擊西、轉移話題，總能巧妙地避開不想回答的問題，是個溝通的策略家。",
      Tradition: "你重視家庭和諧與長輩的感受，傾向遵循傳統價值觀，是父母眼中的乖孩子。",
      Pragmatism: "你非常實際，凡事以解決問題為導向，不喜歡拐彎抹角，追求最高效率。",
      Assertiveness: "你勇於表達自己的想法和底線，不畏懼正面溝通，是個堅守原則的勇者。",
      Rebellion: "你天生反骨，討厭被束縛和說教，對於不合理的要求，你會毫不猶豫地反抗。"
    };

    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let scores = {};
    let radarChart = null;

    async function loadData() {
        try {
            // 載入題目資料
            const questionsResponse = await fetch('./data/questions.json');
            questions = await questionsResponse.json();
            
            // 載入結果資料
            const resultsResponse = await fetch('./data/results.json');
            resultsData = await resultsResponse.json();
            
            totalQuestions = questions.length;
            userAnswers = new Array(totalQuestions).fill(null);
        } catch (error) {
            console.error('載入資料失敗:', error);
            questionElement.textContent = '載入失敗，請重新整理頁面';
        }
    }

    async function startQuiz() {
        currentQuestionIndex = 0;
        await loadData();
        if (totalQuestions > 0) {
            loadQuestion(currentQuestionIndex);
        }
    }

    function showQuestion(index) {
      const q = questions[index];
      progressText.textContent = `第 ${index + 1} / ${questions.length} 題`;
      progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;
      questionText.textContent = q.question;
      
      optionsContainer.innerHTML = '';
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt.text;
        btn.className = 'option-btn';
        btn.onclick = () => selectOption(index, i, btn);
        optionsContainer.appendChild(btn);
      });
      
      nextBtn.style.display = 'none';
    }

    function selectOption(qIndex, optIndex, btn) {
      userAnswers[qIndex] = optIndex;
      document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = true;
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = (currentQuestionIndex === questions.length - 1) ? '看結果' : '下一題';
    }

    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
    });

    async function submitQuiz() {
        progressBar.style.width = '100%';
        
        // 計算各維度分數
        scores = {};
        DIMENSIONS.forEach(dim => scores[dim] = 0);
        questions.forEach((q, idx) => {
          const ansIdx = userAnswers[idx];
          if (ansIdx != null) {
            const eff = q.options[ansIdx].effects;
            for (const dim in eff) {
              if (scores[dim] !== undefined) {
                scores[dim] += eff[dim];
              }
            }
          }
        });

        // 正規化分數
        const norm = DIMENSIONS.map(dim => {
          const maxScore = questions.reduce((sum, q) => {
              return sum + Math.max(...q.options.map(opt => opt.effects[dim] || 0));
          }, 0);
          return Math.round((scores[dim] / (maxScore || 1)) * 100);
        });

        // 找最高分
        let maxIdx = 0;
        norm.forEach((v, i) => { if (v > norm[maxIdx]) maxIdx = i; });

        // 建立結果物件
        const result = {
            scores: scores,
            dimension_names: resultsData.dimensions,
            archetype: resultsData.archetypes[maxDimension] || resultsData.archetypes.default
        };

        finalReportData = result;
        showResult(result);
    }

    function showResult(result) {
        quizContainer.style.display = 'none';
        summaryCard.style.display = 'block';
        resultTitleElement.textContent = result.archetype.title;
        resultDescriptionElement.textContent = result.archetype.description;

        const ctx = document.getElementById('radar-chart').getContext('2d');
        
        if (radarChart) {
            radarChart.destroy();
        }

        const labels = Object.values(result.dimension_names);
        const data = Object.keys(result.dimension_names).map(key => result.scores[key]);

        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '你的生存指數',
                    data: data,
                    backgroundColor: 'rgba(0, 191, 255, 0.2)',
                    borderColor: 'rgba(0, 191, 255, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' },
                        pointLabels: {
                            color: '#e0e0e0',
                            font: {
                                size: 14,
                                family: "'Noto Sans TC', sans-serif"
                            }
                        },
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    restartButton.addEventListener('click', () => {
        window.location.reload();
    });

    shareButton.addEventListener('click', () => {
        if (!finalReportData) return;

        let shareText = `我在「亞洲父母生存挑戰」中，我的生存策略是【${finalReportData.archetype.title}】！\n\n我的能力分佈：\n`;
        const scores = finalReportData.scores;
        const names = finalReportData.dimension_names;
        Object.keys(names).forEach(key => {
            shareText += `- ${names[key]}: ${scores[key]}\n`;
        });
        shareText += `
你也來挑戰看看吧！`;

        navigator.clipboard.writeText(shareText).then(() => {
            clipboardMessage.style.display = 'block';
            setTimeout(() => {
                clipboardMessage.style.display = 'none';
            }, 2000);
        }).catch(err => {
            console.error('複製失敗:', err);
            alert('複製失敗，您的瀏覽器可能不支援此功能。');
        });
    });

    startQuiz();
});