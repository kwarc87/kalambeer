$(document).ready(function() {
    $(".btn-choice").on("click", function(e) {
        e.preventDefault();
        var dictChoice = $(this).data('dict');
        var time = $(this).data('time');
        $("#dict-choice").hide();
        $("#game-loader").show();
        $("#loader-desc").show();
        $("#map").kalambeer({
            "mode" : dictChoice,
            "dictionaryFullPath" : "data/dict_tree_"+dictChoice+"_compressed",
            "time": time,
            loadCallback: function() {
                $(".btn-start").show();
                $("#game-loader").hide();
                $("#loader-desc").hide();
            },
            initCallback: function() {
                $("#game-loader").hide();
                $("#results1").hide();
                $("#results2").hide();
                $("#messages").hide();
                $("#map").removeClass('map-results');
                $("#all-words-list").text("");
            },
            endCallback: function(allWords, foundWords) {
                $("#map").addClass('map-results');
                $("#control-start").hide();
                $("#results1").show();
                $("#results2").show();
                $("#all-words-container").show();
                var maxScore = parseInt($("#max-score").text());
                var userScore = parseInt($("#score").text());
                var percentScore  = Math.floor((userScore/maxScore)*100)+"%";
                $("#percent-score").html(percentScore);
                $("#max_result").val(maxScore);
                $("#user_result").val(userScore);
            }
        });
    });
    $(".btn-start").on("click", function(e) {
        e.preventDefault();
        $("#all-words-container").hide();
        $("#map").html("");
        $("#map").show();
        $("#control-start").hide();
        $("#map").kalambeer('init');
    });
});