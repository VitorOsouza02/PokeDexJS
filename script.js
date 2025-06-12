document.addEventListener('DOMContentLoaded', async () => {
    try {
        await populateSelect('pokemon-type', 'https://pokeapi.co/api/v2/type', 'name');
        await populateSelect('pokemon-region', 'https://pokeapi.co/api/v2/pokedex', 'name');
        await populateSelect('pokemon-attack', 'https://pokeapi.co/api/v2/move', 'name');
    } catch (error) {
        console.error('Erro ao preencher os selects:', error);
    }
});

async function populateSelect(selectId, apiUrl, property) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Erro ao buscar dados de ${selectId}`);
        
        const data = await response.json();
        const results = data.results || data.pokemon_entries || []; // Ajustar de acordo com a resposta da API

        // Adicionar as opções ao select
        results.forEach(item => {
            const option = document.createElement('option');
            option.value = item[property]; // Propriedade como 'name'
            option.textContent = capitalizeFirstLetter(item[property]);
            select.appendChild(option);
        });
    } catch (error) {
        console.error(`Erro ao preencher o select ${selectId}:`, error);
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}



document.getElementById('pokemon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pokemon-name').value.toLowerCase();
    if (!name) return alert('Digite o nome de um Pokémon');
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!response.ok) throw new Error('Pokémon não encontrado');
        const data = await response.json();
        displayPokemonGallery([data]);
    } catch (error) {
        document.getElementById('pokemon-gallery').innerHTML = `<p>${error.message}</p>`;
    }
});

document.getElementById('filters-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('pokemon-type').value;
    const region = document.getElementById('pokemon-region').value;
    const attack = document.getElementById('pokemon-attack').value;

    if (!type && !region && !attack) {
        alert('Selecione um filtro!');
        return;
    }

    try {
        let pokemons = [];

        if (type) {
            const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
            const data = await response.json();
            pokemons = data.pokemon.slice(0, 20).map(p => p.pokemon);
        }
        if (region) {
            const response = await fetch(`https://pokeapi.co/api/v2/pokedex/${region}`);
            if (!response.ok) {
                throw new Error(`Erro: ${response.status} - Região não encontrada`);
            }
            const data = await response.json();
            const regionPokemons = data.pokemon_entries.map(entry => ({
                name: entry.pokemon_species.name,
                url: `https://pokeapi.co/api/v2/pokemon/${entry.pokemon_species.name}`
            }));
            pokemons = mergeResults(pokemons, regionPokemons);
        }        

        if (attack) {
            const response = await fetch(`https://pokeapi.co/api/v2/move/${attack}`);
            const data = await response.json();
            const attackPokemons = data.learned_by_pokemon.map(p => ({
                name: p.name,
                url: `https://pokeapi.co/api/v2/pokemon/${p.name}`
            }));
            pokemons = mergeResults(pokemons, attackPokemons);
        }

        const uniquePokemons = deduplicatePokemons(pokemons);
        const detailedPokemons = await fetchPokemonDetails(uniquePokemons);
        displayPokemonGallery(detailedPokemons);

    } catch (error) {
        document.getElementById('pokemon-gallery').innerHTML = `<p>${error.message}</p>`;
    }
});

/* Função para redefinir os valores dos outros selects */
function resetOtherSelects(exceptId) {
    const selects = ['pokemon-type', 'pokemon-region', 'pokemon-attack'];
    selects.forEach(id => {
        if (id !== exceptId) {
            document.getElementById(id).value = '';
        }
    });
}

/* Monitora mudanças nos selects e reseta os outros */
['pokemon-type', 'pokemon-region', 'pokemon-attack'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => resetOtherSelects(id));
});

function mergeResults(list1, list2) {
    return [...list1, ...list2];
}

function deduplicatePokemons(pokemons) {
    const seen = new Set();
    return pokemons.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
    });
}

async function fetchPokemonDetails(pokemons) {
    const details = [];
    for (const pokemon of pokemons) {
        const response = await fetch(pokemon.url);
        const data = await response.json();
        details.push(data);
    }
    return details;
}
function displayPokemonGallery(pokemons) {
    document.getElementById('pokemon-gallery').innerHTML = pokemons
        .map(p => `
            <div class="card" onclick="showPokemonModal(
                '${p.name}', 
                '${p.sprites.front_default}', 
                '${p.height}', 
                '${p.weight}', 
                '${p.types.map(t => t.type.name).join(", ")}', 
                '${p.abilities.map(a => a.ability.name).join(", ")}', 
                '${p.base_experience}', 
                '${p.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(", ")}'
            )">
                <div class="card-inner">
                    <div class="card-front">
                        <h4>${capitalizeFirstLetter(p.name)}</h4>
                        <img class="pokemon-image" src="${p.sprites.front_default}" alt="${p.name}">
                    </div>
                    <div class="card-back"></div>
                </div>
            </div>
        `)
        .join('');
}

function showPokemonModal(name, image, height, weight, types, abilities, baseExperience, stats) {
    const modalHtml = `
        <div class="modal-overlay" id="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2>${capitalizeFirstLetter(name)}</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <img src="${image}" alt="${name}" class="modal-image">
                        <div class="modal-info">
                        <p><strong>Altura:</strong> ${height / 10} m</p>
                        <p><strong>Peso:</strong> ${weight / 10} kg</p>
                        <p><strong>Tipos:</strong> ${types}</p>
                        <p><strong>Habilidades:</strong> ${abilities}</p>
                        <p><strong>Experiência Base:</strong> ${baseExperience}</p>
                        <p><strong>Estatísticas:</strong> ${stats}</p>
                    </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) {
        modal.remove();
    }
}


