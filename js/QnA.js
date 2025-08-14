// JavaScript Logic (from script.js in the previous explanation)
document.addEventListener('DOMContentLoaded', function () {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling; // Get the next sibling element, which is the answer

            // Close all other open answers
            faqQuestions.forEach(otherQuestion => {
                const otherAnswer = otherQuestion.nextElementSibling;
                if (otherQuestion !== question && otherQuestion.classList.contains('active')) {
                    otherQuestion.classList.remove('active');
                    otherQuestion.setAttribute('aria-expanded', 'false'); // Update ARIA
                    otherAnswer.classList.remove('open');
                    otherAnswer.style.maxHeight = '0'; // Explicitly set to 0 for smooth close
                }
            });

            // Toggle the clicked question's active state and its answer's visibility
            question.classList.toggle('active');
            answer.classList.toggle('open');

            // Update ARIA attribute for accessibility
            if (question.classList.contains('active')) {
                question.setAttribute('aria-expanded', 'true');
            } else {
                question.setAttribute('aria-expanded', 'false');
            }


            if (answer.classList.contains('open')) {
                // Set max-height to the scrollHeight to allow for dynamic content and smooth transition
                // Adding a small buffer (e.g., + 10px) can sometimes prevent cutoff on various browsers
                answer.style.maxHeight = answer.scrollHeight + 10 + 'px';
            } else {
                answer.style.maxHeight = '0';
            }
        });
    });
});