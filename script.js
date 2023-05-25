window.onload = async function () {

    const clickButton = document.getElementById("ClickButton");
    const counterLabel = document.getElementById("CounterLabel");
    let counter = 0;


    clickButton.onClick = function () {
        counter++;
        counterLabel.textContent = "test";
    }

}