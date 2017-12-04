const TITLE_FOR_STATE = "Title";

// reference to the section with id 'video'
const SECTION_VIDEO = document.getElementById("video");

// reference to the section with id 'defaultContent'
const DEFAULT_CONTENT = document.getElementById("defaultContent");

const HOME_URL = "/hitlist/";
var currentUrl = "/hitlist/";

/**
 * This object contains information about what is displayed on the screen.
 * The query attribute contains the query that has been send to solr, to retrieve the video list.
 * The vid attribute contains the information about the video that is selected.
 * It is null if no video is selected.
 * */
var currentState = {
    query: "",
    vid: {}
};

var app = angular.module('ngApp', []);
app.controller('ngCtrl',
    function ($scope, $http) {

        // an array of objects with necessary attributes
        $scope.videoLinks = [{title: '', thumbUrl: '', videoId: '', description: ''}];

        /**
         * Reads the user input and makes the appropriate query to solr.
         * Builds the query first, then makes an http get request.
         * Calls {@link $scope.resolveQuery} to filter and sort the list.
         */
        $scope.submitSearch = function () {

            // saves the current state with url in the browsers history
            window.history.pushState(currentState, TITLE_FOR_STATE, currentUrl);

            var queryInput = document.getElementById("query").value;
            currentUrl = HOME_URL + queryInput;
            var location = "http://localhost:8983/solr/hitlist/select?";

            var dateRestrictions = "";
            // set start-end date restrictions
            var startDate = document.getElementById("startDate").value;
            var endDate = document.getElementById("endDate").value;
            if (startDate != "") {

                // add it to URL
                currentUrl += "_" + startDate;

                // opening
                dateRestrictions = "&fq=publishedAt:[";

                // start
                dateRestrictions += startDate + "T00:00:00Z TO ";

                // end
                if (endDate == "")
                    dateRestrictions += startDate;//only on this day
                else {
                    dateRestrictions += endDate;
                    currentUrl += "_" + endDate;
                }

                // closing
                dateRestrictions += "T24:00:00Z]";
            }
            else if (endDate != "")
                console.log("end date defined without start date is ignored");

            var queryToSend = location + dateRestrictions + "&q=" + queryInput + "&rows=50&wt=json";

            // send and resolve query
            $http.get(queryToSend).then(function (response) {
                document.getElementById("videolist").style.display = "block";
                $scope.resolveQuery(response.data);
            });

            currentState = {
                query: queryToSend,
                vid: null
            };
            // moves to a new state, with url that describes the search input
            window.history.replaceState(currentState, TITLE_FOR_STATE, currentUrl);

        };// submitSearch() closing

        /**
         * Retrieves the "top-hits" videos.
         * As described in the practical specifications, second extension,
         * these are the videos that have one for their position.
         * Fifty such videos are retrieved, because the default ten is not enough.
         * Calls {@link $scope.resolveQuery} to filter and sort the list.
         */
        $scope.getTopHits = function () {

            // saves the current state with url in the browsers history
            window.history.pushState(currentState, TITLE_FOR_STATE, currentUrl);

            // 50 videos with position=1 attribute
            var queryToSend = "http://localhost:8983/solr/hitlist/select?fq=position:1&q=*:*&rows=50&wt=json";
            $http.get(queryToSend).then(function (response) {
                document.getElementById("videolist").style.display = "block";
                $scope.resolveQuery(response.data);
            });

            // moves to a new state, with url that describes the query
            currentState = {
                query: queryToSend,
                vid: null
            };
            currentUrl = HOME_URL + "top-hits";
            window.history.replaceState(currentState, TITLE_FOR_STATE, currentUrl);

        };// getTopHits() closing

        /**
         * Resolves the response to the query.
         * Loads video list, clears duplicates, sorts the videos.
         *
         * @param response the response from the http.get() method when used with a query to solr
         */
        $scope.resolveQuery = function (response) {

            $scope.videoLinks = response.response.docs;

            SECTION_VIDEO.style.display = "none";
            DEFAULT_CONTENT.style.display = "block";

            // heading and text depend whether or not videos are found.
            var header = DEFAULT_CONTENT.getElementsByTagName("h1")[0];
            var para = DEFAULT_CONTENT.getElementsByTagName("p")[0];
            if ($scope.videoLinks.length == 0) {
                header.innerHTML = "Oops! Sorry, no videos found!";
                para.innerHTML = "Please, try another search.";
            }
            else {
                header.innerHTML = "Videos found!";
                para.innerHTML = "Select a video to watch.";
            }

            //sort videos by id and position
            $scope.videoLinks.sort(function (a, b) {

                // same videos are sorted by position
                if ( a.videoId == b.videoId)
                    return a.position - b.position;

                if (a.videoId < b.videoId) return -1;
                else return 1;

            });

            /*
             * Now that all videos are sorted by id and position, duplicates are deleted.
             * Only the first copy of each video is kept
             * which is the copy with the best position.
             */
            var len = $scope.videoLinks.length;
            for (var i = 1; i < len; i++) {
                if ($scope.videoLinks[i].videoId == $scope.videoLinks[i - 1].videoId) {
                    $scope.videoLinks.splice(i--, 1);
                    len--;
                }

            }

            $scope.videoLinks.sort(function (a, b) {

                // order by position
                var diff = a.position - b.position;
                if ( diff != 0 )
                    return diff;

                // order by date if position is the same
                var aDate = new Date(a.publishedAt).getTime();
                var bDate = new Date(b.publishedAt).getTime();
                return bDate - aDate;

            });

        };// resolveQuery() closing

        /**
         * Updates the main content to show the video.
         *
         * @param video the video to show
         */
        $scope.videoSelected = function (video) {

            DEFAULT_CONTENT.style.display = "none";
            SECTION_VIDEO.style.display = "block";

            $scope.videoTitle = video.title;
            $scope.videoDesc = video.description;
            document.getElementById("iframe").setAttribute("src", "https://www.youtube.com/embed/" + video.videoId);

            var date = new Date(video.publishedAt);
            $scope.videoPublished = "Published on " + date.toDateString();


        };// videoSelected() closing

        /**
         * Saves the current state (page view) and
         * loads the selected video by calling videoSelected()
         *
         * @param video the video to show
         */
        $scope.pushStateAndLoadVideo = function (video) {

            // saves the current state with url in the browsers history
            window.history.pushState(currentState, TITLE_FOR_STATE, currentUrl);
            $scope.videoSelected(video);

            var queryToSend = currentState.query;
            // moves to a new state, with url that describes the query
            currentState = {
                query: queryToSend,
                vid: video
            };
            currentUrl = HOME_URL + "v=" + video.videoId;
            window.history.replaceState(currentState, TITLE_FOR_STATE, currentUrl);

        };// pushStateAndLoadVideo() closing

        /**
         * Describes the behaviour when the "forward" and "backward" buttons are pressed.
         * The state currentState object that has been passed to the state contains information
         * for how the page should look.
         *
         * @param event the event created when the state is changed by the forward/backward buttons
         */
        window.onpopstate = function (event) {

            var state = event.state;
            if (state != null) {
                $http.get(state.query).then(function (response) {
                    document.getElementById("videolist").style.display = "block";
                    $scope.resolveQuery(response.data);

                    if (state.vid != null)
                        $scope.videoSelected(state.vid);

                });
            }
            else window.location = document.location;// index page
        }
        ;// onpopstate() closing

    });// app.controller() closing