const input = document.getElementById("searchInput");
const button = document.getElementById("searchBtn");
const mealsDiv = document.getElementById("meals");

button.addEventListener("click", searchMeals);

async function searchMeals() {

    const mealName = input.value.trim();
if (mealName === "") {
    return mealsDiv.innerHTML = "<h2>add meal name .</h2>";
}
 

    try {

        const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/search.php?s=${mealName}`
        );

        const data = await response.json();

        mealsDiv.innerHTML = "";

        if (data.meals === null) {

            mealsDiv.innerHTML = "<h2>No meals found.</h2>";
            return;
        }

        data.meals.forEach(meal => {

            mealsDiv.innerHTML += `
                <div class="card">

                    <img src="${meal.strMealThumb}">

                    <h3>${meal.strMeal}</h3>

                </div>
            `;

        });

    } catch (error) {

        mealsDiv.innerHTML = `<h2>${error.message}</h2>`;

        console.log(error);

    }

}