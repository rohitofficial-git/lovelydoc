document.addEventListener('DOMContentLoaded', () => {
    const processBtn = document.getElementById('process-btn');
    const copyBtn = document.getElementById('copy-btn');
    const input = document.getElementById('input-text');
    const output = document.getElementById('output-text');
    const wordCount = document.getElementById('word-count');

    input.addEventListener('input', () => {
        const text = input.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = `${words} words`;
    });

    processBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) {
            alert('Please enter some text to summarize.');
            return;
        }

        processBtn.classList.add('loading');
        processBtn.disabled = true;
        output.value = '';

        setTimeout(() => {
            const fakeResponse = `• This is a client-side AI summary layout.\n• ${text.split(/\s+/).length} words of text were processed.\n• Fast, private, NO watermark!\n• Note: Wire up an LLM API to this interface to receive real generation outputs.`;
            
            let i = 0;
            const typeWriter = setInterval(() => {
                output.value += fakeResponse.charAt(i);
                i++;
                if (i >= fakeResponse.length) {
                    clearInterval(typeWriter);
                    processBtn.classList.remove('loading');
                    processBtn.disabled = false;
                }
            }, 30);

        }, 1500);
    });

    copyBtn.addEventListener('click', () => {
        if (!output.value) return;
        navigator.clipboard.writeText(output.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Summary';
        }, 2000);
    });
});
