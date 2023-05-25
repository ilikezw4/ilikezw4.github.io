window.onload = async function () {

    const resetButton = document.getElementById("ResetButton");
    const clickButton = document.getElementById("ClickButton");
    const counterLabel = document.getElementById("CounterLabel");
    let counter = 0;


    clickButton.onclick = function () {
        counter++;
        counterLabel.innerHTML = counter.toString();
    }
    resetButton.onclick = function () {
        counter = 0;
        counterLabel.innerHTML = counter.toString();
    }

}